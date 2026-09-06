param(
  [ValidateSet("debug", "release")]
  [string]$Variant = "release",
  [string]$Architectures = "arm64-v8a",
  [string]$SigningEnvFile = "C:\secure\gymmin-upload-key-codex-20260701.env.ps1",
  [switch]$SkipGates
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mobileRoot = Join-Path $repoRoot "apps\mobile"
$androidRoot = Join-Path $mobileRoot "android"
$artifactRoot = Join-Path $repoRoot ".artifacts"

function Write-Step([string]$Message) { Write-Host "[android-apk] $Message" }
function Assert-LastExitCode([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}

if ($Variant -eq "release" -and (Test-Path -LiteralPath $SigningEnvFile)) {
  Write-Step "Loading release signing environment."
  . $SigningEnvFile
}

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
  throw "JDK 17 is required."
}
if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
  throw "ANDROID_HOME or ANDROID_SDK_ROOT is required."
}

if (-not $SkipGates) {
  Push-Location $mobileRoot
  try {
    Write-Step "Running mobile tests and architecture gates..."
    npm test
    Assert-LastExitCode "Mobile tests"
    Write-Step "Running TypeScript check..."
    npm run typecheck
    Assert-LastExitCode "TypeScript check"
  } finally { Pop-Location }
}

if (-not (Test-Path -LiteralPath $androidRoot)) {
  Push-Location $mobileRoot
  try { npx expo prebuild --platform android --no-install } finally { Pop-Location }
}

$task = if ($Variant -eq "release") { "assembleRelease" } else { "assembleDebug" }
$env:NODE_ENV = if ($Variant -eq "release") { "production" } else { "development" }
$gradleTempRoot = Join-Path ($(if ($env:SystemDrive) { $env:SystemDrive } else { "C:" })) "jtmp"
New-Item -ItemType Directory -Path $gradleTempRoot -Force | Out-Null
$previousTemp = $env:TEMP
$previousTmp = $env:TMP
Write-Step "Building $Variant APK from the normal repository path ($Architectures)..."
Push-Location $androidRoot
try {
  # JDK 17+ uses a local AF_UNIX socket while creating its Windows NIO selector.
  # Long or virtualized TEMP paths can make that socket fail with the misleading
  # "Unable to establish loopback connection" error. Keep the child JVM's temp
  # path short and restore the caller's environment immediately after Gradle.
  $env:TEMP = $gradleTempRoot
  $env:TMP = $gradleTempRoot
  .\gradlew.bat $task "-PreactNativeArchitectures=$Architectures" --no-daemon
  Assert-LastExitCode "Gradle $task"
} finally {
  $env:TEMP = $previousTemp
  $env:TMP = $previousTmp
  Pop-Location
}

$source = Join-Path $androidRoot "app\build\outputs\apk\$Variant\app-$Variant.apk"
if (-not (Test-Path -LiteralPath $source)) { throw "APK was not created: $source" }

New-Item -ItemType Directory -Path $artifactRoot -Force | Out-Null
$architectureName = ($Architectures -replace '[^a-zA-Z0-9_-]+', '-').Trim('-')
if (-not $architectureName) { $architectureName = "android" }
$destination = Join-Path $artifactRoot "Gymmin-$architectureName-$Variant-latest.apk"
Copy-Item -LiteralPath $source -Destination $destination -Force
Write-Output "APK_PATH=$destination"
