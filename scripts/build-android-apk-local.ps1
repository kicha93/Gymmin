param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [ValidateSet("debug", "release")]
  [string]$Variant = "debug",
  [string]$Architectures = "arm64-v8a",
  [switch]$SkipTypecheck
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mobileRoot = Join-Path $repoRoot "apps\mobile"
$androidRoot = Join-Path $mobileRoot "android"
$mobileBuildConfigPath = Join-Path $mobileRoot "src\config\buildConfig.ts"

function Write-Step {
  param([string]$Message)
  Write-Host "[local-apk] $Message"
}

function Write-MobileBuildConfig {
  param([string]$ApiUrl)

  $encodedApiUrl = $ApiUrl | ConvertTo-Json -Compress
  Set-Content `
    -Path $mobileBuildConfigPath `
    -Value "export const BUILD_API_BASE_URL = $encodedApiUrl;" `
    -Encoding UTF8
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

$normalizedApiBaseUrl = $ApiBaseUrl.Trim().TrimEnd("/")
if (-not ($normalizedApiBaseUrl -match "^https?://")) {
  throw "ApiBaseUrl must start with http:// or https://. Received: $ApiBaseUrl"
}

Assert-Command "java" "Install JDK 17, for example: winget install EclipseAdoptium.Temurin.17.JDK"

if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
  throw "ANDROID_HOME or ANDROID_SDK_ROOT is not set. Install Android Studio or Android command-line tools and set the SDK path."
}

Write-Step "Mobile root: $mobileRoot"
Write-Step "Backend URL embedded in APK: $normalizedApiBaseUrl"
Write-Step "Architectures: $Architectures"

if (-not $SkipTypecheck) {
  Write-Step "Running TypeScript check..."
  Push-Location $mobileRoot
  try {
    npm run typecheck
  } finally {
    Pop-Location
  }
}

Push-Location $mobileRoot
try {
  $env:EXPO_PUBLIC_API_BASE_URL = $normalizedApiBaseUrl
  Write-MobileBuildConfig -ApiUrl $normalizedApiBaseUrl

  if (-not (Test-Path $androidRoot)) {
    Write-Step "Generating native Android project with Expo prebuild..."
    npx expo prebuild --platform android --no-install
  }

  Push-Location $androidRoot
  try {
    if ($Variant -eq "release") {
      Write-Step "Building release APK..."
      .\gradlew.bat assembleRelease "-PreactNativeArchitectures=$Architectures"
      $apkPath = Join-Path $androidRoot "app\build\outputs\apk\release\app-release.apk"
    } else {
      Write-Step "Building debug APK..."
      .\gradlew.bat assembleDebug "-PreactNativeArchitectures=$Architectures"
      $apkPath = Join-Path $androidRoot "app\build\outputs\apk\debug\app-debug.apk"
    }
  } finally {
    Pop-Location
  }

  if (-not (Test-Path $apkPath)) {
    throw "APK was not found at expected path: $apkPath"
  }

  Write-Step "APK ready: $apkPath"
} finally {
  Pop-Location
}
