param(
  [ValidateSet("x86_64", "universal")]
  [string]$Target = "x86_64",
  [string]$ShortBuildRoot = "C:\gymmin-emulator-apk",
  [string]$SigningEnvFile = "C:\secure\gymmin-upload-key-codex-20260701.env.ps1",
  [int]$BackendPort = 5198,
  [ValidateSet("Cloudflare", "Ngrok")]
  [string]$BackendTunnelProvider = "Cloudflare",
  [switch]$NoEnsureBackendTunnel,
  [switch]$SkipTypecheck
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[emulator-apk-oneclick] $Message"
}

$architectures = if ($Target -eq "universal") {
  "armeabi-v7a,arm64-v8a,x86,x86_64"
} else {
  "x86_64"
}

$oneClickScript = Join-Path $PSScriptRoot "build-github-apk-oneclick.ps1"
if (-not (Test-Path $oneClickScript)) {
  throw "Shared APK one-click helper is missing: $oneClickScript"
}

Write-Step "Building local standalone APK for target: $Target"
Write-Step "Architectures: $architectures"
Write-Step "GitHub publishing is disabled."

& $oneClickScript `
  -Architectures $architectures `
  -ShortBuildRoot $ShortBuildRoot `
  -SigningEnvFile $SigningEnvFile `
  -BackendPort $BackendPort `
  -BackendTunnelProvider $BackendTunnelProvider `
  -NoEnsureBackendTunnel:$NoEnsureBackendTunnel `
  -SkipTypecheck:$SkipTypecheck `
  -SkipPublish
