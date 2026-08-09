param(
  [string]$Architectures = "arm64-v8a",
  [string]$SigningEnvFile = "C:\secure\gymmin-upload-key-codex-20260701.env.ps1",
  [switch]$SkipGates
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mobileRoot = Join-Path $repoRoot "apps\mobile"
$androidRoot = Join-Path $mobileRoot "android"
$artifactRoot = Join-Path $repoRoot ".artifacts"

function Assert-LastExitCode([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}

if (Test-Path -LiteralPath $SigningEnvFile) { . $SigningEnvFile }
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw "JDK 17 is required." }
if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) { throw "ANDROID_HOME or ANDROID_SDK_ROOT is required." }

if (-not $SkipGates) {
  Push-Location $mobileRoot
  try {
    npm test
    Assert-LastExitCode "Mobile tests"
    npm run typecheck
    Assert-LastExitCode "TypeScript check"
  } finally { Pop-Location }
}

if (-not (Test-Path -LiteralPath $androidRoot)) {
  Push-Location $mobileRoot
  try { npx expo prebuild --platform android --no-install } finally { Pop-Location }
}

Push-Location $androidRoot
try {
  $env:NODE_ENV = "production"
  .\gradlew.bat bundleRelease "-PreactNativeArchitectures=$Architectures" --no-daemon
  Assert-LastExitCode "Gradle bundleRelease"
} finally { Pop-Location }

$source = Join-Path $androidRoot "app\build\outputs\bundle\release\app-release.aab"
if (-not (Test-Path -LiteralPath $source)) { throw "AAB was not created: $source" }
New-Item -ItemType Directory -Path $artifactRoot -Force | Out-Null
$destination = Join-Path $artifactRoot "Gymmin-release-latest.aab"
Copy-Item -LiteralPath $source -Destination $destination -Force
Write-Output "AAB_PATH=$destination"
