param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [string]$ShortBuildRoot = "C:\gymmin-aab",
  [switch]$SkipTypecheck
)

$ErrorActionPreference = "Stop"

$buildParameters = @{
  ApiBaseUrl = $ApiBaseUrl
  ShortBuildRoot = $ShortBuildRoot
}

if ($SkipTypecheck) {
  $buildParameters.SkipTypecheck = $true
}

& (Join-Path $PSScriptRoot "build-android-aab-local.ps1") @buildParameters
