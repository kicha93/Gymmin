param(
  [string]$ApkPath = "",
  [int]$Port = 8095,
  [int]$StartupWaitSeconds = 45,
  [string]$UrlOutputPath = "",
  [ValidateSet("Ngrok", "Cloudflare")]
  [string]$TunnelProvider = "Ngrok"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$logsRoot = Join-Path $repoRoot ".appdata\logs"
$serverScript = Join-Path $logsRoot "serve-apk-download.js"
$serverLog = Join-Path $logsRoot "apk-download-server.log"
$serverErrLog = Join-Path $logsRoot "apk-download-server.err.log"
$tunnelLog = Join-Path $logsRoot "apk-download-cloudflared.log"
$tunnelErrLog = Join-Path $logsRoot "apk-download-cloudflared.err.log"
$ngrokLog = Join-Path $logsRoot "apk-download-ngrok.out.log"
$ngrokErrLog = Join-Path $logsRoot "apk-download-ngrok.err.log"

New-Item -ItemType Directory -Path $logsRoot -Force | Out-Null

if (-not $ApkPath) {
  $ApkPath = Join-Path $repoRoot ".artifacts\Gymmin-arm64-v8a-release-latest.apk"
}

if (-not $UrlOutputPath) {
  $UrlOutputPath = Join-Path $repoRoot ".artifacts\latest-apk-download-url.txt"
}

$resolvedApkPath = Resolve-Path $ApkPath
if (-not (Test-Path $resolvedApkPath)) {
  throw "APK not found: $ApkPath"
}

function Stop-ProcessById {
  param([int]$ProcessId)

  if ($ProcessId -eq $PID -or $ProcessId -le 0) {
    return
  }

  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Stop-ListeningPort {
  param([int]$TargetPort)

  $listeners = netstat -ano |
    Select-String -Pattern "LISTENING" |
    Where-Object { $_.Line -match "[:.]$TargetPort\s" }

  foreach ($listener in $listeners) {
    $parts = $listener.Line.Trim() -split "\s+"
    Stop-ProcessById -ProcessId ([int]$parts[-1])
  }
}

function Get-NgrokPath {
  $wingetPath = "C:\Users\Administrator\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"
  if (Test-Path $wingetPath) {
    return $wingetPath
  }

  $command = Get-Command ngrok -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  throw "Nie znaleziono ngrok.exe. Zainstaluj ngrok albo popraw sciezke w scripts/start-apk-download.ps1."
}

Stop-ListeningPort -TargetPort $Port

Get-CimInstance Win32_Process |
  Where-Object {
    ($_.Name -eq "cloudflared.exe" -and $_.CommandLine -match "localhost:$Port") -or
    ($TunnelProvider -eq "Ngrok" -and $_.Name -eq "ngrok.exe")
  } |
  ForEach-Object { Stop-ProcessById -ProcessId $_.ProcessId }

Remove-Item $serverLog, $serverErrLog, $tunnelLog, $tunnelErrLog, $ngrokLog, $ngrokErrLog -Force -ErrorAction SilentlyContinue

$apkPathJson = $resolvedApkPath.Path | ConvertTo-Json -Compress
$portJson = $Port | ConvertTo-Json -Compress
$serverCode = @"
const http = require('http');
const fs = require('fs');
const path = require('path');

const apkPath = $apkPathJson;
const port = $portJson;
const fileName = path.basename(apkPath);

const server = http.createServer((request, response) => {
  request.socket.setKeepAlive(false);
  response.shouldKeepAlive = false;

  const requestPath = (request.url || '/').split('?')[0];
  if (requestPath !== '/' && requestPath !== '/' + fileName) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  console.log(new Date().toISOString() + ' ' + request.method + ' ' + request.url + ' range=' + (request.headers.range || '-'));

  const stat = fs.statSync(apkPath);
  const commonHeaders = {
    'content-type': 'application/octet-stream',
    'content-disposition': 'attachment; filename="' + fileName + '"',
    'content-transfer-encoding': 'binary',
    'x-content-type-options': 'nosniff',
    'accept-ranges': 'bytes',
    'cache-control': 'no-store, no-cache, must-revalidate, max-age=0, no-transform',
    'pragma': 'no-cache',
    'expires': '0',
    'connection': 'close'
  };

  function finishResponseWithFile(stream) {
    stream.on('error', (error) => {
      console.error('File stream error', error);
      if (!response.headersSent) {
        response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8', 'connection': 'close' });
      }
      response.end('Download failed');
    });
    response.on('finish', () => {
      request.socket.destroySoon ? request.socket.destroySoon() : request.socket.destroy();
    });
    stream.pipe(response);
  }

  if (request.method === 'HEAD') {
    response.writeHead(200, {
      ...commonHeaders,
      'content-length': stat.size
    });
    response.end();
    return;
  }

  const range = request.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      response.writeHead(416, {
        ...commonHeaders,
        'content-range': 'bytes */' + stat.size
      });
      response.end();
      return;
    }

    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= stat.size) {
      response.writeHead(416, {
        ...commonHeaders,
        'content-range': 'bytes */' + stat.size
      });
      response.end();
      return;
    }

    response.writeHead(206, {
      ...commonHeaders,
      'content-length': end - start + 1,
      'content-range': 'bytes ' + start + '-' + end + '/' + stat.size
    });
    finishResponseWithFile(fs.createReadStream(apkPath, { start, end }));
    return;
  }

  response.writeHead(200, {
    ...commonHeaders,
    'content-length': stat.size,
  });
  finishResponseWithFile(fs.createReadStream(apkPath));
});

server.keepAliveTimeout = 0;
server.headersTimeout = 0;

server.listen(port, '127.0.0.1', () => {
  console.log('APK download server listening on http://127.0.0.1:' + port + '/');
  console.log('Serving ' + apkPath);
});
"@

Set-Content -Path $serverScript -Value $serverCode -Encoding UTF8

$nodeProcess = Start-Process `
  -FilePath "node.exe" `
  -ArgumentList @($serverScript) `
  -WindowStyle Hidden `
  -RedirectStandardOutput $serverLog `
  -RedirectStandardError $serverErrLog `
  -PassThru

Start-Sleep -Seconds 2
if ($nodeProcess.HasExited) {
  Get-Content $serverLog -ErrorAction SilentlyContinue
  throw "APK download server failed to start."
}

$tunnelLogForParsing = $tunnelLog
$tunnelErrLogForParsing = $tunnelErrLog
$urlPattern = "https://[a-zA-Z0-9-]+\.trycloudflare\.com"

if ($TunnelProvider -eq "Ngrok") {
  $ngrokPath = Get-NgrokPath
  $tunnelLogForParsing = $ngrokLog
  $tunnelErrLogForParsing = $ngrokErrLog
  $urlPattern = "https://[a-zA-Z0-9-]+\.ngrok-free\.dev"
  $tunnelProcess = Start-Process `
    -FilePath $ngrokPath `
    -ArgumentList @("http", "$Port", "--log=stdout") `
    -WindowStyle Hidden `
    -RedirectStandardOutput $ngrokLog `
    -RedirectStandardError $ngrokErrLog `
    -PassThru
} else {
  $cloudflared = Get-Command "cloudflared" -ErrorAction Stop
  $tunnelProcess = Start-Process `
    -FilePath $cloudflared.Source `
    -ArgumentList @("tunnel", "--url", "http://localhost:$Port") `
    -WindowStyle Hidden `
    -RedirectStandardOutput $tunnelLog `
    -RedirectStandardError $tunnelErrLog `
    -PassThru
}

$publicUrl = $null
$deadline = (Get-Date).AddSeconds($StartupWaitSeconds)
while ((Get-Date) -lt $deadline -and -not $publicUrl) {
  Start-Sleep -Seconds 1
  if (Test-Path $tunnelLogForParsing) {
    $logText = @(
      Get-Content $tunnelLogForParsing -Raw -ErrorAction SilentlyContinue
      Get-Content $tunnelErrLogForParsing -Raw -ErrorAction SilentlyContinue
    ) -join "`n"
    $match = [regex]::Match($logText, $urlPattern)
    if ($match.Success) {
      $publicUrl = $match.Value
    }
  }
}

if (-not $publicUrl) {
  Get-Content $tunnelLogForParsing -Tail 120 -ErrorAction SilentlyContinue
  Get-Content $tunnelErrLogForParsing -Tail 120 -ErrorAction SilentlyContinue
  throw "$TunnelProvider tunnel did not publish a URL in time."
}

$downloadUrl = "$publicUrl/$([System.IO.Path]::GetFileName($resolvedApkPath.Path))"
$urlOutputDirectory = Split-Path -Parent $UrlOutputPath
if ($urlOutputDirectory) {
  New-Item -ItemType Directory -Path $urlOutputDirectory -Force | Out-Null
}
Set-Content -Path $UrlOutputPath -Value $downloadUrl -Encoding UTF8

Write-Output "APK download is ready."
Write-Output "Tunnel provider: $TunnelProvider"
Write-Output "Local URL:  http://127.0.0.1:$Port/"
Write-Output "Public URL: $downloadUrl"
Write-Output "APK_DOWNLOAD_URL=$downloadUrl"
Write-Output "URL file: $UrlOutputPath"
Write-Output ""
Write-Output "Logs:"
Write-Output "  Server: $serverLog"
Write-Output "  Server errors: $serverErrLog"
Write-Output "  Tunnel: $tunnelLogForParsing"
Write-Output "  Tunnel errors: $tunnelErrLogForParsing"
