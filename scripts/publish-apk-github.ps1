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

& $gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  throw "GitHub CLI is not authenticated. Run: $gh auth login --hostname github.com --git-protocol https --web --scopes repo"
}

& $gh repo view $GitHubRepo *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Step "Creating private GitHub repository: $GitHubRepo"
  & $gh repo create $GitHubRepo --private --description "Gymmin Android APK builds" --add-readme
  if ($LASTEXITCODE -ne 0) {
    throw "Could not create GitHub repository: $GitHubRepo"
  }
}

$releaseExists = $true
& $gh release view $ReleaseTag --repo $GitHubRepo *> $null
if ($LASTEXITCODE -ne 0) {
  $releaseExists = $false
}

if (-not $releaseExists) {
  Write-Step "Creating GitHub release $ReleaseTag in $GitHubRepo..."
  & $gh release create $ReleaseTag $resolvedApkPath --repo $GitHubRepo --title $ReleaseTitle --notes "Gymmin Android APK build."
} else {
  Write-Step "Uploading APK to existing GitHub release $ReleaseTag in $GitHubRepo..."
  & $gh release upload $ReleaseTag $resolvedApkPath --repo $GitHubRepo --clobber
}

if ($LASTEXITCODE -ne 0) {
  throw "Could not upload APK to GitHub release $ReleaseTag."
}

$releaseUrl = (& $gh release view $ReleaseTag --repo $GitHubRepo --json url --jq ".url").Trim()
if (-not $releaseUrl) {
  throw "GitHub release was uploaded, but release URL could not be resolved."
}

Set-Content -LiteralPath $downloadUrlFile -Value $releaseUrl

Write-Output ""
Write-Output "APK_PATH=$resolvedApkPath"
Write-Output "APK_DOWNLOAD_URL=$releaseUrl"
Write-Output "APK_DOWNLOAD_URL_FILE=$downloadUrlFile"
