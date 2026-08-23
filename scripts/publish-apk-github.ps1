param(
  [string]$ApkPath = "",
  [string]$GitHubRepo = "kicha93/gymmin-apk",
  [string]$ReleaseTag = "",
  [string]$ReleaseTitle = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$artifactsRoot = Join-Path $repoRoot ".artifacts"
$downloadUrlFile = Join-Path $artifactsRoot "latest-apk-download-url.txt"
$appConfig = Get-Content -LiteralPath (Join-Path $repoRoot "apps\mobile\app.json") -Raw | ConvertFrom-Json
$appVersion = [string]$appConfig.expo.version
if (-not $ReleaseTag) { $ReleaseTag = "v$appVersion" }
if (-not $ReleaseTitle) { $ReleaseTitle = "Gymmin $appVersion" }

if (-not $ApkPath) {
  $ApkPath = Join-Path $artifactsRoot "Gymmin-arm64-v8a-release-latest.apk"
}

function Write-Step {
  param([string]$Message)
  Write-Host "[github-apk] $Message"
}

function Get-GitHubCliPath {
  $command = Get-Command gh -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $portableGh = Join-Path $repoRoot ".tools\gh\bin\gh.exe"
  if (Test-Path $portableGh) {
    return $portableGh
  }

  throw "GitHub CLI was not found. Install gh or download the portable CLI to .tools\gh\bin\gh.exe."
}

if (-not (Test-Path $ApkPath)) {
  throw "APK was not found: $ApkPath"
}

New-Item -ItemType Directory -Path $artifactsRoot -Force | Out-Null

$resolvedApkPath = (Resolve-Path $ApkPath).Path
$gh = Get-GitHubCliPath

function Invoke-GitHubCliWithRetry {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [int]$MaxAttempts = 4,
    [switch]$Silent
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      if ($Silent) {
        & $gh @Arguments *> $null
      } else {
        & $gh @Arguments | Out-Host
      }
      $exitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($exitCode -eq 0) { return $true }
    if ($attempt -lt $MaxAttempts) {
      $delaySeconds = [Math]::Min(15, $attempt * 5)
      Write-Step "GitHub CLI attempt $attempt/$MaxAttempts failed; retrying in $delaySeconds seconds..."
      Start-Sleep -Seconds $delaySeconds
    }
  }

  return $false
}

if (-not (Invoke-GitHubCliWithRetry -Arguments @("auth", "status") -Silent)) {
  throw "GitHub CLI is not authenticated. Run: $gh auth login --hostname github.com --git-protocol https --web --scopes repo"
}

$releaseExists = Invoke-GitHubCliWithRetry -Arguments @("release", "view", $ReleaseTag, "--repo", $GitHubRepo) -MaxAttempts 2 -Silent

if (-not $releaseExists) {
  Write-Step "Creating GitHub release $ReleaseTag in $GitHubRepo..."
  $releaseCreated = Invoke-GitHubCliWithRetry -Arguments @("release", "create", $ReleaseTag, $resolvedApkPath, "--repo", $GitHubRepo, "--title", $ReleaseTitle, "--notes", "Gymmin Android APK build.")
  if (-not $releaseCreated) {
    Write-Step "Release creation did not succeed; retrying as an update of existing release $ReleaseTag..."
    $releaseUploaded = Invoke-GitHubCliWithRetry -Arguments @("release", "upload", $ReleaseTag, $resolvedApkPath, "--repo", $GitHubRepo, "--clobber")
  }
} else {
  Write-Step "Uploading APK to existing GitHub release $ReleaseTag in $GitHubRepo..."
  $releaseUploaded = Invoke-GitHubCliWithRetry -Arguments @("release", "upload", $ReleaseTag, $resolvedApkPath, "--repo", $GitHubRepo, "--clobber")
}

if (-not $releaseCreated -and -not $releaseUploaded) {
  throw "Could not upload APK to GitHub release $ReleaseTag."
}

$releaseUrl = ""
for ($attempt = 1; $attempt -le 4 -and -not $releaseUrl; $attempt++) {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $releaseUrlOutput = & $gh release view $ReleaseTag --repo $GitHubRepo --json url --jq ".url" 2>$null
    $releaseUrlExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($releaseUrlExitCode -eq 0) {
    $releaseUrl = ([string]$releaseUrlOutput).Trim()
  } elseif ($attempt -lt 4) {
    $delaySeconds = [Math]::Min(15, $attempt * 5)
    Write-Step "Could not resolve release URL; retrying in $delaySeconds seconds..."
    Start-Sleep -Seconds $delaySeconds
  }
}
if (-not $releaseUrl) {
  throw "GitHub release was uploaded, but release URL could not be resolved."
}

Set-Content -LiteralPath $downloadUrlFile -Value $releaseUrl

Write-Output ""
Write-Output "APK_PATH=$resolvedApkPath"
Write-Output "APK_DOWNLOAD_URL=$releaseUrl"
Write-Output "APK_DOWNLOAD_URL_FILE=$downloadUrlFile"
