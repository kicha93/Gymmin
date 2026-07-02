param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [string]$ShortBuildRoot = "C:\gymmin-aab",
  [switch]$SkipTypecheck
)

$ErrorActionPreference = "Stop"

$argsForBuild = @(
  "-ApiBaseUrl", $ApiBaseUrl,
  "-ShortBuildRoot", $ShortBuildRoot
)

if ($SkipTypecheck) {
  $argsForBuild += "-SkipTypecheck"
}

& (Join-Path $PSScriptRoot "build-android-aab-local.ps1") @argsForBuild
