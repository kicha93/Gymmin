param(
  [string]$Architectures = "arm64-v8a",
  [string]$GitHubRepo = "kicha93/gymmin-apk",
  [string]$ReleaseTag = "v1.0",
  [string]$ReleaseTitle = "Gymmin 1.0",
  [string]$SigningEnvFile = "C:\secure\gymmin-upload-key-codex-20260701.env.ps1",
  [switch]$SkipPublish
)

$ErrorActionPreference = "Stop"
$buildScript = Join-Path $PSScriptRoot "build-android-apk.ps1"
$publishScript = Join-Path $PSScriptRoot "publish-apk-github.ps1"

$output = & $buildScript -Variant release -Architectures $Architectures -SigningEnvFile $SigningEnvFile
$output | Write-Host
$apkLine = $output | Where-Object { $_ -is [string] -and $_.StartsWith("APK_PATH=") } | Select-Object -Last 1
if (-not $apkLine) { throw "APK build did not return an artifact path." }
$apkPath = $apkLine.Substring("APK_PATH=".Length)

if (-not $SkipPublish) {
  & $publishScript -ApkPath $apkPath -GitHubRepo $GitHubRepo -ReleaseTag $ReleaseTag -ReleaseTitle $ReleaseTitle
}
