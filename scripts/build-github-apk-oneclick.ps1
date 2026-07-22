param(
  [string]$ApiBaseUrl = $env:GYMMIN_APK_API_BASE_URL,
  [string]$Architectures = "arm64-v8a",
  [string]$ShortBuildRoot = "C:\gymmin-apk",
  [string]$GitHubRepo = "kicha93/gymmin-apk",
  [string]$ReleaseTag = "v1.0",
  [string]$ReleaseTitle = "Gymmin 1.0",
  [string]$SigningEnvFile = "C:\secure\gymmin-upload-key-codex-20260701.env.ps1",
  [int]$BackendPort = 5198,
  [ValidateSet("Cloudflare", "Ngrok")]
  [string]$BackendTunnelProvider = "Cloudflare",
  [switch]$NoEnsureBackendTunnel,
  [switch]$SkipTypecheck,
  [switch]$SkipPublish
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mainAndroidRoot = Join-Path $repoRoot "apps\mobile\android"
$shortAndroidRoot = Join-Path $ShortBuildRoot "repo\apps\mobile\android"

function Write-Step {
  param([string]$Message)
  Write-Host "[github-apk-oneclick] $Message"
}

function Test-LocalNgrokTunnelFallback {
  param([string]$NormalizedUrl)

  if (-not ($NormalizedUrl -match "\.ngrok-free\.dev$")) {
    return $false
  }

  try {
    $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5
    $matchingTunnel = $tunnels.tunnels |
      Where-Object { $_.public_url -eq $NormalizedUrl } |
      Select-Object -First 1

    if (-not $matchingTunnel) {
      return $false
    }

    $localHealthUrl = "$($matchingTunnel.config.addr.TrimEnd('/'))/health"
    Write-Step "Public ngrok health check failed, verifying local tunnel target instead: $localHealthUrl"
    $localResponse = Invoke-WebRequest `
      -Uri $localHealthUrl `
      -UseBasicParsing `
      -TimeoutSec 10

    if ($localResponse.StatusCode -ge 200 -and $localResponse.StatusCode -le 299 -and $localResponse.Content -match '"status"\s*:\s*"ok"') {
      Write-Step "Local ngrok tunnel target is healthy. Continuing with public URL: $NormalizedUrl"
      return $true
    }
  } catch {
    Write-Step "Local ngrok fallback check failed: $($_.Exception.Message)"
  }

  return $false
}

function Test-BackendUrl {
  param([string]$Url)

  if ([string]::IsNullOrWhiteSpace($Url)) {
    throw "ApiBaseUrl is required. Pass -ApiBaseUrl 'https://current-backend-url' or set GYMMIN_APK_API_BASE_URL."
  }

  $normalized = $Url.Trim().TrimEnd("/")
  if (-not ($normalized -match "^https://")) {
    throw "ApiBaseUrl must use HTTPS for a published APK. Received: $Url"
  }

  $healthUrl = "$normalized/health"
  Write-Step "Checking backend health: $healthUrl"
  try {
    $response = Invoke-WebRequest `
      -Uri $healthUrl `
      -Headers @{ "ngrok-skip-browser-warning" = "true" } `
      -UseBasicParsing `
      -TimeoutSec 20

    if ($response.StatusCode -lt 200 -or $response.StatusCode -gt 299 -or $response.Content -notmatch '"status"\s*:\s*"ok"') {
      throw "Unexpected /health response: HTTP $($response.StatusCode) $($response.Content)"
    }
  } catch {
    throw "Backend health check failed for $healthUrl. Start the backend/tunnel first, then rebuild the APK. Details: $($_.Exception.Message)"
  }

  return $normalized
}

function Start-BackendTunnelForBuild {
  $backendTunnelScript = Join-Path $PSScriptRoot "start-backend-tunnel.ps1"
  $backendUrlFile = Join-Path $repoRoot ".artifacts\backend-url.txt"

  if (-not (Test-Path $backendTunnelScript)) {
    throw "Backend tunnel helper is missing: $backendTunnelScript"
  }

  Write-Step "Starting or attaching backend tunnel for APK build..."
  $tunnelOutput = & $backendTunnelScript -BackendPort $BackendPort -TunnelProvider $BackendTunnelProvider -KeepExisting
  $detectedBackendUrl = $tunnelOutput |
    Where-Object { $_ -match "^https?://" } |
    Select-Object -Last 1

  if (-not $detectedBackendUrl -and (Test-Path $backendUrlFile)) {
    $detectedBackendUrl = (Get-Content $backendUrlFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  }

  if ([string]::IsNullOrWhiteSpace($detectedBackendUrl)) {
    throw "Backend tunnel started, but no public backend URL was produced."
  }

  return $detectedBackendUrl.Trim().TrimEnd("/")
}

function Stop-GradleIfPresent {
  param([string]$AndroidRoot)

  $gradlew = Join-Path $AndroidRoot "gradlew.bat"
  if (-not (Test-Path $gradlew)) {
    return
  }

  Write-Step "Stopping Gradle daemon in $AndroidRoot"
  Push-Location $AndroidRoot
  try {
    .\gradlew.bat --stop
  } finally {
    Pop-Location
  }
}

if (Test-Path $SigningEnvFile) {
  Write-Step "Loading release signing environment from $SigningEnvFile"
  . $SigningEnvFile
} else {
  Write-Step "Signing env file not found: $SigningEnvFile"
  Write-Step "Continuing with current environment variables. Release signing must be configured for the Android build to pass."
}

Stop-GradleIfPresent -AndroidRoot $shortAndroidRoot
Stop-GradleIfPresent -AndroidRoot $mainAndroidRoot

try {
  $ApiBaseUrl = Test-BackendUrl -Url $ApiBaseUrl
} catch {
  if ($NoEnsureBackendTunnel) {
    throw
  }

  Write-Step "Provided backend URL is unavailable or missing. Falling back to a fresh backend tunnel."
  Write-Step "Health check details: $($_.Exception.Message)"
  $ApiBaseUrl = Start-BackendTunnelForBuild
  $ApiBaseUrl = Test-BackendUrl -Url $ApiBaseUrl
}

$buildScript = Join-Path $PSScriptRoot "build-github-apk.ps1"

if ($SkipPublish) {
  Write-Step "Building local APK (GitHub publishing disabled)"
} else {
  Write-Step "Building and publishing APK to GitHub Release $GitHubRepo@$ReleaseTag"
}
Write-Step "Backend URL: $ApiBaseUrl"
Write-Step "Architectures: $Architectures"

& $buildScript `
  -ApiBaseUrl $ApiBaseUrl `
  -Architectures $Architectures `
  -ShortBuildRoot $ShortBuildRoot `
  -GitHubRepo $GitHubRepo `
  -ReleaseTag $ReleaseTag `
  -ReleaseTitle $ReleaseTitle `
  -SkipTypecheck:$SkipTypecheck `
  -SkipPublish:$SkipPublish
