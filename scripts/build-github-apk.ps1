param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [string]$Architectures = "arm64-v8a",
  [string]$ShortBuildRoot = "C:\gymmin-apk",
  [string]$GitHubRepo = "kicha93/gymmin-apk",
  [string]$ReleaseTag = "v1.0",
  [string]$ReleaseTitle = "Gymmin 1.0",
  [switch]$SkipTypecheck,
  [switch]$SkipPublish
)

$ErrorActionPreference = "Stop"

$script = Join-Path $PSScriptRoot "build-and-publish-android-apk.ps1"

& $script `
  -ApiBaseUrl $ApiBaseUrl `
  -Architectures $Architectures `
  -ShortBuildRoot $ShortBuildRoot `
  -PublishProvider GitHub `
  -GitHubRepo $GitHubRepo `
  -ReleaseTag $ReleaseTag `
  -ReleaseTitle $ReleaseTitle `
  -SkipTypecheck:$SkipTypecheck `
  -SkipPublish:$SkipPublish
