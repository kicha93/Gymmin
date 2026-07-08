param(
  [int]$BackendPort = 5198,
  [int]$ExpoPort = 8081,
  [int]$StartupWaitSeconds = 90,
  [switch]$Local
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mobileRoot = Join-Path $repoRoot "apps\mobile"
$backendRoot = Join-Path $repoRoot "backend\Gymmin.Api"
$logsRoot = Join-Path $repoRoot ".appdata\logs"

New-Item -ItemType Directory -Path $logsRoot -Force | Out-Null

$backendLog = Join-Path $logsRoot "backend-run.log"
$ngrokOutLog = Join-Path $logsRoot "backend-ngrok.out.log"
$ngrokErrLog = Join-Path $logsRoot "backend-ngrok.err.log"
$expoLog = Join-Path $logsRoot "expo-tunnel.log"
$runnerLog = Join-Path $logsRoot "start-expo-tunnel-runner.log"

Remove-Item $runnerLog -Force -ErrorAction SilentlyContinue

function Write-RunnerLog {
  param([string]$Message)

  $line = "$(Get-Date -Format o) $Message"
  Add-Content -Path $runnerLog -Value $line
  Write-Host $Message
}

function Stop-MatchingProcess {
  param(
    [Parameter(Mandatory = $true)]
    [ScriptBlock]$Predicate
  )

  $currentPid = $PID
  try {
    Get-CimInstance Win32_Process |
      Where-Object { $_.ProcessId -ne $currentPid -and (& $Predicate $_) } |
      ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
      }
  } catch {
    Write-RunnerLog "Could not inspect process command lines with Get-CimInstance: $($_.Exception.Message)"
    throw
  }
}

function Stop-ProcessById {
  param([int]$ProcessId)

  if ($ProcessId -eq $PID -or $ProcessId -le 0) {
    return
  }

  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Stop-ListeningPort {
  param([int]$Port)

  $listeners = netstat -ano |
    Select-String -Pattern "LISTENING" |
    Where-Object { $_.Line -match "[:.]$Port\s" }

  foreach ($listener in $listeners) {
    $parts = $listener.Line.Trim() -split "\s+"
    $processId = [int]$parts[-1]
    Stop-ProcessById -ProcessId $processId
  }
}

function Stop-KnownProcessName {
  param([string[]]$Names)

  Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $Names -contains $_.ProcessName } |
    ForEach-Object { Stop-ProcessById -ProcessId $_.Id }
}

function Stop-OldDevProcesses {
  try {
    Stop-MatchingProcess {
      param($process)
      $process.Name -eq "ngrok.exe" -or
      ($process.Name -eq "node.exe" -and $process.CommandLine -match "expo|metro|$ExpoPort") -or
      ($process.Name -eq "dotnet.exe" -and $process.CommandLine -match "run --urls http://localhost:$BackendPort") -or
      $process.Name -eq "Gymmin.Api.exe"
    }
  } catch {
    Write-RunnerLog "Falling back to port/name based cleanup..."
    Stop-ListeningPort -Port $BackendPort
    Stop-ListeningPort -Port $ExpoPort
    Stop-ListeningPort -Port 4040
    Stop-KnownProcessName -Names @("ngrok", "Gymmin.Api")
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

  throw "Nie znaleziono ngrok.exe. Zainstaluj ngrok albo popraw sciezke w scripts/start-expo-tunnel.ps1."
}

function Read-WebContent {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Uri,
    [hashtable]$Headers = @{},
    [int]$TimeoutSec = 15
  )

  $response = Invoke-WebRequest -Uri $Uri -Headers $Headers -TimeoutSec $TimeoutSec -UseBasicParsing

  if ($response.Content -is [byte[]]) {
    return [System.Text.Encoding]::UTF8.GetString($response.Content)
  }

  return [string]$response.Content
}

function Wait-ForTextEndpoint {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Uri,
    [Parameter(Mandatory = $true)]
    [string]$ExpectedText,
    [hashtable]$Headers = @{},
    [int]$Attempts = 20
  )

  $lastError = ""

  for ($i = 0; $i -lt $Attempts; $i += 1) {
    try {
      $content = Read-WebContent -Uri $Uri -Headers $Headers
      if ($content -match [regex]::Escape($ExpectedText)) {
        return $content
      }

      $lastError = "Unexpected response from $Uri`: $content"
    } catch {
      $lastError = $_.Exception.Message
    }

    Start-Sleep -Seconds 1
  }

  throw "Endpoint did not become ready: $Uri. Last error: $lastError"
}

function Get-LastRegexMatch {
  param(
    [object[]]$Lines,
    [Parameter(Mandatory = $true)]
    [string]$Pattern,
    [int]$Group = 1
  )

  $matches = $Lines | Select-String -Pattern $Pattern
  $lastMatch = $matches | Select-Object -Last 1

  if (-not $lastMatch -or $lastMatch.Matches.Count -eq 0) {
    return $null
  }

  return $lastMatch.Matches[0].Groups[$Group].Value
}

Write-RunnerLog "Cleaning old Expo/ngrok/backend processes..."
Stop-OldDevProcesses

Start-Sleep -Seconds 2

Write-RunnerLog "Starting backend on http://localhost:$BackendPort ..."
$backendCommand = "Set-Location '$backendRoot'; `$env:ASPNETCORE_ENVIRONMENT='Development'; `$env:DOTNET_ENVIRONMENT='Development'; `$env:Logging__EventLog__LogLevel__Default='None'; dotnet run --urls http://localhost:$BackendPort *> '$backendLog'"
Start-Process -FilePath "powershell.exe" `
  -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand) `
  -WorkingDirectory $backendRoot `
  -WindowStyle Hidden

$backendReady = $false
for ($i = 0; $i -lt 30; $i += 1) {
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/health" -TimeoutSec 2 | Out-Null
    $backendReady = $true
    break
  } catch {
    Start-Sleep -Seconds 1
  }
}

if (-not $backendReady) {
  Write-RunnerLog "Backend log:"
  Get-Content $backendLog -Tail 80 -ErrorAction SilentlyContinue
  throw "Backend did not start on port $BackendPort."
}

$backendPublicUrl = "http://localhost:$BackendPort"

if (-not $Local) {
  Write-RunnerLog "Starting public backend tunnel..."
  $ngrokPath = Get-NgrokPath
  Remove-Item $ngrokOutLog, $ngrokErrLog -Force -ErrorAction SilentlyContinue
  $ngrokCommand = "& '$ngrokPath' http $BackendPort --log=stdout *> '$ngrokOutLog'"
  Start-Process -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $ngrokCommand) `
    -WindowStyle Hidden

  $backendPublicUrl = $null
  for ($i = 0; $i -lt 30; $i += 1) {
    try {
      $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2
      $backendPublicUrl = ($tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1).public_url
      if ($backendPublicUrl) {
        break
      }
    } catch {
    }

    Start-Sleep -Seconds 1
  }

  if (-not $backendPublicUrl) {
    Write-RunnerLog "Ngrok stdout:"
    Get-Content $ngrokOutLog -Tail 80 -ErrorAction SilentlyContinue
    Write-RunnerLog "Ngrok stderr:"
    Get-Content $ngrokErrLog -Tail 80 -ErrorAction SilentlyContinue
    throw "Backend tunnel did not start."
  }

  Wait-ForTextEndpoint `
    -Uri "$backendPublicUrl/health" `
    -ExpectedText '"status":"ok"' `
    -Headers @{ "ngrok-skip-browser-warning" = "true" } `
    | Out-Null
}

Write-RunnerLog "Starting Expo for Expo Go..."
Remove-Item $expoLog -Force -ErrorAction SilentlyContinue
$expoTunnelSession = "gymmin-" + [guid]::NewGuid().ToString("N").Substring(0, 16)
$expoModeArgs = if ($Local) { "--offline" } else { "--tunnel" }
$expoOfflineEnv = if ($Local) { "1" } else { "0" }
$expoApiEnv = if ($Local) { "" } else { "`$env:EXPO_PUBLIC_API_BASE_URL='$backendPublicUrl'; " }
$expoTunnelEnv = if ($Local) { "" } else { "`$env:EXPO_FORCE_WEBCONTAINER_ENV='1'; `$env:EXPO_TUNNEL_SUBDOMAIN='$expoTunnelSession'; " }
$expoCommand = "Set-Location '$mobileRoot'; `$env:Path='C:\Users\Administrator\AppData\Roaming\npm;'+`$env:Path; `$env:EXPO_OFFLINE='$expoOfflineEnv'; `$env:EXPO_DEBUG='1'; $expoTunnelEnv$expoApiEnv npx expo start --clear $expoModeArgs --port $ExpoPort *> '$expoLog'"
Start-Process -FilePath "powershell.exe" `
  -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $expoCommand) `
  -WorkingDirectory $mobileRoot `
  -WindowStyle Hidden

Start-Sleep -Seconds $StartupWaitSeconds

$expoLogContent = Get-Content $expoLog -Tail 360 -ErrorAction SilentlyContinue
$expoHost = Get-LastRegexMatch -Lines $expoLogContent -Pattern "URL:\s+exp://(.+)$"
$expoUrl = if ($expoHost) { "exp://$expoHost" } else { $null }
$statusUrl = Get-LastRegexMatch -Lines $expoLogContent -Pattern "Waiting on (http://.+)$"

if (-not $statusUrl) {
  $statusUrl = Get-LastRegexMatch -Lines $expoLogContent -Pattern "URL:\s+(http://.+)$"
}

if (-not $expoUrl) {
  Write-RunnerLog "Expo log:"
  $expoLogContent
  throw "Expo tunnel did not expose an exp:// URL."
}

if (-not $statusUrl) {
  Write-RunnerLog "Expo log:"
  $expoLogContent
  throw "Expo tunnel did not expose a status URL."
}

Wait-ForTextEndpoint `
  -Uri "$statusUrl/status" `
  -ExpectedText "packager-status:running" `
  | Out-Null

Wait-ForTextEndpoint `
  -Uri "$backendPublicUrl/health" `
  -ExpectedText '"status":"ok"' `
  -Headers @{ "ngrok-skip-browser-warning" = "true" } `
  | Out-Null

Write-RunnerLog ""
Write-RunnerLog "Gymmin is running through tunnels."
Write-RunnerLog "Expo Go URL:     $expoUrl"
Write-RunnerLog "Expo status URL: $statusUrl"
Write-RunnerLog "Backend URL:     $backendPublicUrl"
Write-RunnerLog ""
Write-RunnerLog "Logs:"
Write-RunnerLog "  Runner: $runnerLog"
Write-RunnerLog "  Backend: $backendLog"
Write-RunnerLog "  Backend tunnel: $ngrokOutLog"
Write-RunnerLog "  Expo: $expoLog"
