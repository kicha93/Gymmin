param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [ValidateSet("debug", "release")]
  [string]$Variant = "debug",
  [string]$Architectures = "arm64-v8a",
  [string]$ShortBuildRoot = "C:\gymmin-local-apk",
  [switch]$SkipTypecheck
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mobileRoot = Join-Path $repoRoot "apps\mobile"
$androidRoot = Join-Path $mobileRoot "android"
$shortRoot = $ShortBuildRoot.TrimEnd("\")
$shortRepoRoot = Join-Path $shortRoot "repo"
$markerPath = Join-Path $shortRoot ".gymmin-local-apk-build-root"
$artifactDir = Join-Path $repoRoot ".artifacts"

function Write-Step {
  param([string]$Message)
  Write-Host "[local-apk] $Message"
}

function Assert-Command {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$InstallHint
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing command '$Name'. $InstallHint"
  }
}

function Write-MobileBuildConfig {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CopiedMobileRoot,
    [Parameter(Mandatory = $true)]
    [string]$ApiUrl
  )

  $configPath = Join-Path $CopiedMobileRoot "src\config\buildConfig.ts"
  $encodedApiUrl = $ApiUrl | ConvertTo-Json -Compress
  Set-Content `
    -Path $configPath `
    -Value "export const BUILD_API_BASE_URL = $encodedApiUrl;" `
    -Encoding UTF8
}

function Clear-AndroidBuildCaches {
  param([Parameter(Mandatory = $true)][string]$CopiedMobileRoot)

  $targets = @(
    (Join-Path $CopiedMobileRoot "android\build"),
    (Join-Path $CopiedMobileRoot "android\.gradle"),
    (Join-Path $CopiedMobileRoot "android\app\build"),
    (Join-Path $CopiedMobileRoot "android\app\.cxx")
  )

  foreach ($target in $targets) {
    if (Test-Path $target) {
      Remove-Item -LiteralPath $target -Recurse -Force
    }
  }

  $nodeModules = Join-Path $CopiedMobileRoot "node_modules"
  if (Test-Path $nodeModules) {
    Get-ChildItem -Path $nodeModules -Recurse -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -in @("build", ".gradle", ".cxx") -and $_.FullName -match "\\android(\\|$)" } |
      Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  }
}

$normalizedApiBaseUrl = $ApiBaseUrl.Trim().TrimEnd("/")
if (-not ($normalizedApiBaseUrl -match "^https?://")) {
  throw "ApiBaseUrl must start with http:// or https://. Received: $ApiBaseUrl"
}

Assert-Command "java" "Install JDK 17, for example: winget install EclipseAdoptium.Temurin.17.JDK"

if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
  throw "ANDROID_HOME or ANDROID_SDK_ROOT is not set. Install Android Studio or Android command-line tools and set the SDK path."
}

if (-not $SkipTypecheck) {
  Write-Step "Running TypeScript check..."
  Push-Location $mobileRoot
  try {
    npm run typecheck
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $androidRoot)) {
  Write-Step "Generating native Android project with Expo prebuild..."
  Push-Location $mobileRoot
  try {
    npx expo prebuild --platform android --no-install
  } finally {
    Pop-Location
  }
}

if (Test-Path $shortRoot) {
  if (-not (Test-Path $markerPath)) {
    throw "ShortBuildRoot exists but is not marked as a Gymmin local APK build folder: $shortRoot"
  }
} else {
  New-Item -ItemType Directory -Path $shortRoot | Out-Null
  Set-Content -Path $markerPath -Value "Gymmin Android local APK short-path build folder" -Encoding UTF8
}

Write-Step "Copying repo to short build path: $shortRepoRoot"
robocopy `
  $repoRoot `
  $shortRepoRoot `
  /MIR `
  /XD .git .artifacts .android-sdk .expo57-template apps\mobile\.expo-sdk57-export-smoke apps\mobile\android\build backend\Gymmin.Api\bin backend\Gymmin.Api\obj backend\Gymmin.Api.Tests\bin backend\Gymmin.Api.Tests\obj `
  /XF *.apk *.aab sdk57-gradle-debug.log | Out-Host
if ($LASTEXITCODE -gt 7) {
  throw "robocopy failed with exit code $LASTEXITCODE"
}

$copiedMobileRoot = Join-Path $shortRepoRoot "apps\mobile"
$copiedAndroidRoot = Join-Path $copiedMobileRoot "android"
Clear-AndroidBuildCaches -CopiedMobileRoot $copiedMobileRoot
Write-MobileBuildConfig -CopiedMobileRoot $copiedMobileRoot -ApiUrl $normalizedApiBaseUrl

Write-Step "Backend URL embedded in APK: $normalizedApiBaseUrl"
Write-Step "Architectures: $Architectures"
Write-Step "Building $Variant APK from short path: $copiedAndroidRoot"

Push-Location $copiedAndroidRoot
try {
  $env:NODE_ENV = if ($Variant -eq "release") { "production" } else { "development" }
  if ($Variant -eq "release") {
    .\gradlew.bat assembleRelease "-PreactNativeArchitectures=$Architectures"
    $apkPath = Join-Path $copiedAndroidRoot "app\build\outputs\apk\release\app-release.apk"
  } else {
    .\gradlew.bat assembleDebug "-PreactNativeArchitectures=$Architectures"
    $apkPath = Join-Path $copiedAndroidRoot "app\build\outputs\apk\debug\app-debug.apk"
  }
} finally {
  Pop-Location
}

if (-not (Test-Path $apkPath)) {
  throw "APK was not found at expected path: $apkPath"
}

$safeArchitectureName = ($Architectures -replace "[^a-zA-Z0-9_-]+", "-").Trim("-")
if (-not $safeArchitectureName) {
  $safeArchitectureName = "android"
}

New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
$artifactPath = Join-Path $artifactDir "Gymmin-$safeArchitectureName-$Variant-local.apk"
Copy-Item -LiteralPath $apkPath -Destination $artifactPath -Force
Write-Step "APK ready: $artifactPath"
