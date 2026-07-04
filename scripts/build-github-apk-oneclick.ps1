param(
  [string]$ApiBaseUrl = $env:GYMMIN_APK_API_BASE_URL,
  [string]$Architectures = "arm64-v8a",
  [string]$ShortBuildRoot = "C:\gymmin-apk",
  [string]$GitHubRepo = "kicha93/gymmin-apk",
  [string]$ReleaseTag = "v1.0",
  [string]$ReleaseTitle = "Gymmin 1.0",
  [string]$SigningEnvFile = "C:\secure\gymmin-upload-key-codex-20260701.env.ps1",
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

function Test-BackendUrl {
  param([string]$Url)

  if ([string]::IsNullOrWhiteSpace($Url)) {
    throw "ApiBaseUrl is required. Pass -ApiBaseUrl 'https://current-backend-url' or set GYMMIN_APK_API_BASE_URL."
  }

  $normalized = $Url.Trim().TrimEnd("/")
  if (-not ($normalized -match "^https?://")) {
    throw "ApiBaseUrl must start with http:// or https://. Received: $Url"
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

$ApiBaseUrl = Test-BackendUrl -Url $ApiBaseUrl
$buildScript = Join-Path $PSScriptRoot "build-github-apk.ps1"

Write-Step "Building and publishing APK to GitHub Release $GitHubRepo@$ReleaseTag"
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
