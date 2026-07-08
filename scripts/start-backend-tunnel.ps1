param(
  [int]$BackendPort = 5198,
  [ValidateSet("Cloudflare", "Ngrok")]
  [string]$TunnelProvider = "Cloudflare",
  [int]$StartupWaitSeconds = 45,
  [switch]$KeepExisting
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendRoot = Join-Path $repoRoot "backend\Gymmin.Api"
$artifactsRoot = Join-Path $repoRoot ".artifacts"
$logsRoot = Join-Path $repoRoot ".appdata\logs"

New-Item -ItemType Directory -Path $artifactsRoot -Force | Out-Null
New-Item -ItemType Directory -Path $logsRoot -Force | Out-Null

$backendLog = Join-Path $logsRoot "backend-run.log"
$backendErrLog = Join-Path $logsRoot "backend-run.err.log"
$ngrokOutLog = Join-Path $logsRoot "backend-ngrok.out.log"
$ngrokErrLog = Join-Path $logsRoot "backend-ngrok.err.log"
$cloudflaredOutLog = Join-Path $logsRoot "backend-cloudflared.out.log"
$cloudflaredErrLog = Join-Path $logsRoot "backend-cloudflared.err.log"
$backendPidFile = Join-Path $artifactsRoot "backend.pid"
$ngrokPidFile = Join-Path $artifactsRoot "backend-ngrok.pid"
$cloudflaredPidFile = Join-Path $artifactsRoot "backend-cloudflared.pid"
$backendUrlFile = Join-Path $artifactsRoot "backend-ngrok-url.txt"
$cloudflareUrlFile = Join-Path $artifactsRoot "backend-cloudflare-url.txt"
$currentBackendUrlFile = Join-Path $artifactsRoot "backend-url.txt"

function Write-Step {
  param([string]$Message)
  Write-Host "[backend-tunnel] $Message"
}

function Stop-ProcessFromPidFile {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  $rawPid = (Get-Content $Path -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($rawPid -match "^\d+$") {
    Stop-Process -Id ([int]$rawPid) -Force -ErrorAction SilentlyContinue
  }

  Remove-Item $Path -Force -ErrorAction SilentlyContinue
}

function Stop-ListeningPort {
  param([int]$Port)

  $listeners = netstat -ano |
    Select-String -Pattern "LISTENING" |
    Where-Object { $_.Line -match "[:.]$Port\s" }

  foreach ($listener in $listeners) {
    $parts = $listener.Line.Trim() -split "\s+"
    $processId = [int]$parts[-1]
    if ($processId -gt 0 -and $processId -ne $PID) {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
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

  throw "Nie znaleziono ngrok.exe. Zainstaluj ngrok albo popraw sciezke w scripts/start-backend-tunnel.ps1."
}

function Get-CloudflaredPath {
  $command = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  throw "Nie znaleziono cloudflared.exe. Zainstaluj cloudflared albo ustaw -TunnelProvider Ngrok."
}

function Test-BackendHealth {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest `
      -Uri "$($Url.TrimEnd('/'))/health" `
      -Headers @{ "ngrok-skip-browser-warning" = "true" } `
      -UseBasicParsing `
      -TimeoutSec 10

    return ($response.StatusCode -ge 200 -and $response.StatusCode -le 299 -and $response.Content -match '"status"\s*:\s*"ok"')
  } catch {
    return $false
  }
}

function Wait-ForLocalBackend {
  $healthUrl = "http://127.0.0.1:$BackendPort/health"
  for ($i = 0; $i -lt $StartupWaitSeconds; $i += 1) {
    try {
      Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2 | Out-Null
      return
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  Write-Step "Backend log:"
  Get-Content $backendLog -Tail 120 -ErrorAction SilentlyContinue
  Get-Content $backendErrLog -Tail 120 -ErrorAction SilentlyContinue
  throw "Backend did not become healthy on $healthUrl."
}

function Wait-ForNgrokUrl {
  for ($i = 0; $i -lt $StartupWaitSeconds; $i += 1) {
    try {
      $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2
      $publicUrl = ($tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1).public_url
      if ($publicUrl -and (Test-BackendHealth -Url $publicUrl)) {
        return $publicUrl.TrimEnd("/")
      }
    } catch {
    }

    Start-Sleep -Seconds 1
  }

  Write-Step "Ngrok stdout:"
  Get-Content $ngrokOutLog -Tail 120 -ErrorAction SilentlyContinue
  Write-Step "Ngrok stderr:"
  Get-Content $ngrokErrLog -Tail 120 -ErrorAction SilentlyContinue
  throw "Backend tunnel did not become healthy."
}

function Wait-ForCloudflareUrl {
  $urlPattern = "https://[a-zA-Z0-9-]+\.trycloudflare\.com"

  for ($i = 0; $i -lt $StartupWaitSeconds; $i += 1) {
    $lines = @()
    $lines += Get-Content $cloudflaredOutLog -Tail 120 -ErrorAction SilentlyContinue
    $lines += Get-Content $cloudflaredErrLog -Tail 120 -ErrorAction SilentlyContinue

    $match = $lines | Select-String -Pattern $urlPattern | Select-Object -Last 1
    if ($match -and $match.Matches.Count -gt 0) {
      $publicUrl = $match.Matches[0].Value.TrimEnd("/")
      if (Test-BackendHealth -Url $publicUrl) {
        return $publicUrl
      }
    }

    Start-Sleep -Seconds 1
  }

  Write-Step "Cloudflared stdout:"
  Get-Content $cloudflaredOutLog -Tail 120 -ErrorAction SilentlyContinue
  Write-Step "Cloudflared stderr:"
  Get-Content $cloudflaredErrLog -Tail 120 -ErrorAction SilentlyContinue
  throw "Cloudflare backend tunnel did not become healthy."
}

if ($KeepExisting -and (Test-Path $currentBackendUrlFile)) {
  $existingUrl = (Get-Content $currentBackendUrlFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($existingUrl -and (Test-BackendHealth -Url $existingUrl)) {
    Write-Step "Existing backend tunnel is healthy: $existingUrl"
    Write-Output $existingUrl.TrimEnd("/")
    exit 0
  }
}

Write-Step "Checking local backend on http://127.0.0.1:$BackendPort ..."
$localBackendUrl = "http://127.0.0.1:$BackendPort"
$localBackendAlreadyRunning = Test-BackendHealth -Url $localBackendUrl

Write-Step "Stopping previous backend tunnel processes..."
Stop-ProcessFromPidFile -Path $ngrokPidFile
Stop-ProcessFromPidFile -Path $cloudflaredPidFile
Stop-ListeningPort -Port 4040
Remove-Item $backendLog, $backendErrLog, $ngrokOutLog, $ngrokErrLog, $cloudflaredOutLog, $cloudflaredErrLog, $backendUrlFile, $cloudflareUrlFile, $currentBackendUrlFile -Force -ErrorAction SilentlyContinue

if ($localBackendAlreadyRunning) {
  Write-Step "Local backend is already running. Attaching tunnel without restarting it."
} else {
  Write-Step "Local backend is not running. Starting backend on http://127.0.0.1:$BackendPort ..."
  Stop-ProcessFromPidFile -Path $backendPidFile
  Stop-ListeningPort -Port $BackendPort

  $backendCommand = "Set-Location '$backendRoot'; `$env:ASPNETCORE_ENVIRONMENT='Development'; `$env:DOTNET_ENVIRONMENT='Development'; `$env:Logging__EventLog__LogLevel__Default='None'; dotnet run --urls http://127.0.0.1:$BackendPort *> '$backendLog'"
  $backendProcess = Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand) `
    -WorkingDirectory $backendRoot `
    -WindowStyle Hidden `
    -PassThru

  Set-Content -Path $backendPidFile -Value $backendProcess.Id
  Wait-ForLocalBackend
}

if ($TunnelProvider -eq "Ngrok") {
  Write-Step "Starting ngrok backend tunnel..."
  $ngrokPath = Get-NgrokPath
  $ngrokCommand = "& '$ngrokPath' http $BackendPort --log=stdout *> '$ngrokOutLog'"
  $ngrokProcess = Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $ngrokCommand) `
    -WindowStyle Hidden `
    -PassThru

  Set-Content -Path $ngrokPidFile -Value $ngrokProcess.Id
  $backendPublicUrl = Wait-ForNgrokUrl
  Set-Content -Path $backendUrlFile -Value $backendPublicUrl
} else {
  Write-Step "Starting Cloudflare backend tunnel..."
  $cloudflaredPath = Get-CloudflaredPath
  $cloudflaredCommand = "& '$cloudflaredPath' tunnel --url http://127.0.0.1:$BackendPort --no-autoupdate *> '$cloudflaredOutLog'"
  $cloudflaredProcess = Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $cloudflaredCommand) `
    -WindowStyle Hidden `
    -PassThru

  Set-Content -Path $cloudflaredPidFile -Value $cloudflaredProcess.Id
  $backendPublicUrl = Wait-ForCloudflareUrl
  Set-Content -Path $cloudflareUrlFile -Value $backendPublicUrl
}

Set-Content -Path $currentBackendUrlFile -Value $backendPublicUrl

Write-Step "Backend URL: $backendPublicUrl"
Write-Output $backendPublicUrl
