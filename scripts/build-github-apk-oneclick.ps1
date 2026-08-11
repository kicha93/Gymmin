param(
  [string]$Architectures = "arm64-v8a",
  [string]$GitHubRepo = "kicha93/gymmin-apk",
  [string]$ReleaseTag = "",
  [string]$ReleaseTitle = "",
  [string]$SigningEnvFile = "C:\secure\gymmin-upload-key-codex-20260701.env.ps1",
  [switch]$SkipPublish
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mobileRoot = Join-Path $repoRoot "apps\mobile"
$appConfigPath = Join-Path $mobileRoot "app.json"
$artifactRoot = Join-Path $repoRoot ".artifacts"
$buildScript = Join-Path $PSScriptRoot "build-android-apk.ps1"
$publishScript = Join-Path $PSScriptRoot "publish-apk-github.ps1"
$manifestGuard = Join-Path $PSScriptRoot "validate-android-exported-components.mjs"

function Write-Step([string]$Message) { Write-Host "[github-apk-oneclick] $Message" }
function Assert-LastExitCode([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}
function Get-AndroidBuildTool([string]$FileName) {
  $sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
  if (-not $sdkRoot) { throw "ANDROID_HOME or ANDROID_SDK_ROOT is required." }
  $tool = Get-ChildItem -LiteralPath (Join-Path $sdkRoot "build-tools") -Recurse -Filter $FileName -File |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if (-not $tool) { throw "Android build tool was not found: $FileName" }
  return $tool.FullName
}

if (-not (Test-Path -LiteralPath $appConfigPath)) { throw "Expo app config was not found: $appConfigPath" }
$appConfig = Get-Content -LiteralPath $appConfigPath -Raw | ConvertFrom-Json
$appVersion = [string]$appConfig.expo.version
$versionCode = [int]$appConfig.expo.android.versionCode
$applicationId = [string]$appConfig.expo.android.package
if (-not $appVersion -or $versionCode -le 0 -or -not $applicationId) {
  throw "Expo version, Android versionCode, or package is invalid."
}
if (-not $ReleaseTag) { $ReleaseTag = "v$appVersion" }
if (-not $ReleaseTitle) { $ReleaseTitle = "Gymmin $appVersion" }

Write-Step "Preparing Gymmin $appVersion (versionCode $versionCode, $applicationId)."
Push-Location $repoRoot
try {
  Write-Step "Checking dependency advisories..."
  npm run security:dependencies
  Assert-LastExitCode "Dependency audit"
  Write-Step "Running Expo Doctor..."
  Push-Location $mobileRoot
  try {
    npx --no-install expo-doctor
    Assert-LastExitCode "Expo Doctor"
  } finally { Pop-Location }
  Write-Step "Checking patch whitespace..."
  git diff --check
  Assert-LastExitCode "git diff --check"
} finally { Pop-Location }

Write-Step "Running full mobile gates and building the signed release APK..."
$output = & $buildScript -Variant release -Architectures $Architectures -SigningEnvFile $SigningEnvFile
$output | Write-Host
$apkLine = $output | Where-Object { $_ -is [string] -and $_.StartsWith("APK_PATH=") } | Select-Object -Last 1
if (-not $apkLine) { throw "APK build did not return an artifact path." }
$apkPath = $apkLine.Substring("APK_PATH=".Length)

Write-Step "Validating the final merged Android manifest..."
node $manifestGuard
Assert-LastExitCode "Merged Android manifest validation"

$architectureName = ($Architectures -replace '[^a-zA-Z0-9_-]+', '-').Trim('-')
if (-not $architectureName) { $architectureName = "android" }
New-Item -ItemType Directory -Path $artifactRoot -Force | Out-Null
$versionedApkPath = Join-Path $artifactRoot "Gymmin-$appVersion-vc$versionCode-$architectureName-release.apk"
Copy-Item -LiteralPath $apkPath -Destination $versionedApkPath -Force

Write-Step "Verifying APK package metadata and signing certificate..."
$aapt = Get-AndroidBuildTool "aapt.exe"
$badging = & $aapt dump badging $versionedApkPath
Assert-LastExitCode "APK package metadata validation"
$packageLine = $badging | Where-Object { $_ -like "package:*" } | Select-Object -First 1
if (-not $packageLine -or
    $packageLine -notmatch "name='$([regex]::Escape($applicationId))'" -or
    $packageLine -notmatch "versionCode='$versionCode'" -or
    $packageLine -notmatch "versionName='$([regex]::Escape($appVersion))'") {
  throw "APK metadata does not match app.json. Received: $packageLine"
}
$apksigner = Get-AndroidBuildTool "apksigner.bat"
& $apksigner verify --verbose --print-certs $versionedApkPath
Assert-LastExitCode "APK signature validation"

if (-not $SkipPublish) {
  Write-Step "Publishing the verified APK to GitHub Release $ReleaseTag..."
  & $publishScript -ApkPath $versionedApkPath -GitHubRepo $GitHubRepo -ReleaseTag $ReleaseTag -ReleaseTitle $ReleaseTitle
}

Write-Output "APK_PATH=$versionedApkPath"
Write-Output "APP_VERSION=$appVersion"
Write-Output "VERSION_CODE=$versionCode"
Write-Output "APPLICATION_ID=$applicationId"
