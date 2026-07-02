param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [string]$GitHubRepo = "kicha93/gymmin-apk",
  [string]$ReleaseTag = "v1.0",
  [string]$ReleaseTitle = "Gymmin 1.0",
  [string]$Architectures = "arm64-v8a",
  [switch]$SkipTypecheck,
  [switch]$SkipPublish
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$artifactsRoot = Join-Path $repoRoot ".artifacts"
$debugApkSourcePath = Join-Path $repoRoot "apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk"
$safeArchitectureName = ($Architectures -replace "[^a-zA-Z0-9_-]+", "-").Trim("-")
if (-not $safeArchitectureName) {
  $safeArchitectureName = "android"
}
$debugApkArtifactPath = Join-Path $artifactsRoot "Gymmin.apk"
$workspaceSdk = Join-Path $repoRoot ".android-sdk"

function Write-Step {
  param([string]$Message)
  Write-Host "[github-debug-apk] $Message"
}

$normalizedApiBaseUrl = $ApiBaseUrl.Trim().TrimEnd("/")
if (-not ($normalizedApiBaseUrl -match "^https?://")) {
  throw "ApiBaseUrl must start with http:// or https://. Received: $ApiBaseUrl"
}

if (-not $env:ANDROID_SDK_ROOT -and -not $env:ANDROID_HOME -and (Test-Path $workspaceSdk)) {
  $env:ANDROID_SDK_ROOT = $workspaceSdk
  $env:ANDROID_HOME = $workspaceSdk
}

Write-Step "Building debug APK for GitHub phone testing..."
$localBuildScript = Join-Path $PSScriptRoot "build-android-apk-local.ps1"
if ($SkipTypecheck) {
  & $localBuildScript `
    -ApiBaseUrl $normalizedApiBaseUrl `
    -Variant debug `
    -Architectures $Architectures `
    -SkipTypecheck
} else {
  & $localBuildScript `
    -ApiBaseUrl $normalizedApiBaseUrl `
    -Variant debug `
    -Architectures $Architectures
}

if (-not (Test-Path $debugApkSourcePath)) {
  throw "Debug APK was not found at expected path: $debugApkSourcePath"
}

New-Item -ItemType Directory -Path $artifactsRoot -Force | Out-Null
Copy-Item -LiteralPath $debugApkSourcePath -Destination $debugApkArtifactPath -Force

$artifact = Get-Item $debugApkArtifactPath
Write-Step "Debug APK ready: $($artifact.FullName)"
Write-Step "Debug APK size: $([math]::Round($artifact.Length / 1MB, 2)) MB"

if ($SkipPublish) {
  Write-Output ""
  Write-Output "APK_PATH=$($artifact.FullName)"
  return
}

Write-Step "Publishing debug APK to GitHub release..."
& (Join-Path $PSScriptRoot "publish-apk-github.ps1") `
  -ApkPath $artifact.FullName `
  -GitHubRepo $GitHubRepo `
  -ReleaseTag $ReleaseTag `
  -ReleaseTitle $ReleaseTitle
