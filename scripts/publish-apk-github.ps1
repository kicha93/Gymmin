param(
  [string]$ApkPath = "",
  [string]$GitHubRepo = "kicha93/gymmin-apk",
  [string]$ReleaseTag = "",
  [string]$ReleaseTitle = "",
  [ValidateRange(1, 20)][int]$GitHubMaxAttempts = 6,
  [switch]$CheckOnly
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

New-Item -ItemType Directory -Path $artifactsRoot -Force | Out-Null

$gh = Get-GitHubCliPath

function Invoke-GitHubCliWithRetry {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [int]$MaxAttempts = $GitHubMaxAttempts,
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

function Invoke-GitHubCliCaptureWithRetry {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [int]$MaxAttempts = $GitHubMaxAttempts
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      $commandOutput = & $gh @Arguments 2>$null
      $exitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($exitCode -eq 0) { return ($commandOutput | Out-String).Trim() }
    if ($attempt -lt $MaxAttempts) {
      $delaySeconds = [Math]::Min(15, $attempt * 5)
      Write-Step "GitHub CLI attempt $attempt/$MaxAttempts failed; retrying in $delaySeconds seconds..."
      Start-Sleep -Seconds $delaySeconds
    }
  }

  return ""
}

if (-not (Invoke-GitHubCliWithRetry -Arguments @("auth", "status") -Silent)) {
  throw "GitHub CLI is not authenticated. Run: $gh auth login --hostname github.com --git-protocol https --web --scopes repo"
}

if (-not (Invoke-GitHubCliWithRetry -Arguments @("repo", "view", $GitHubRepo) -Silent)) {
  throw "GitHub repository could not be reached after $GitHubMaxAttempts attempts: $GitHubRepo"
}

if ($CheckOnly) {
  Write-Output "GITHUB_PREFLIGHT=OK"
  Write-Output "GITHUB_REPO=$GitHubRepo"
  return
}

if (-not (Test-Path $ApkPath)) {
  throw "APK was not found: $ApkPath"
}
$resolvedApkPath = (Resolve-Path $ApkPath).Path
$latestAliasPath = Join-Path $artifactsRoot "Gymmin-arm64-v8a-release-latest.apk"
if (-not [string]::Equals(
  [System.IO.Path]::GetFullPath($resolvedApkPath),
  [System.IO.Path]::GetFullPath($latestAliasPath),
  [System.StringComparison]::OrdinalIgnoreCase
)) {
  Copy-Item -LiteralPath $resolvedApkPath -Destination $latestAliasPath -Force
}
$publishAssetPaths = @($resolvedApkPath, $latestAliasPath) | Select-Object -Unique

$releaseCreated = $false
$releaseUploaded = $false
$releaseExists = Invoke-GitHubCliWithRetry -Arguments @("release", "view", $ReleaseTag, "--repo", $GitHubRepo) -MaxAttempts 3 -Silent

if (-not $releaseExists) {
  # A failed release lookup may mean either "not found" or a temporary API
  # timeout. Updating first makes reruns idempotent and avoids a duplicate-tag
  # failure for an existing release. Only then do we try to create a new tag.
  Write-Step "Release lookup was inconclusive; trying an idempotent update of $ReleaseTag first..."
  $releaseUploaded = Invoke-GitHubCliWithRetry -Arguments (@("release", "upload", $ReleaseTag) + $publishAssetPaths + @("--repo", $GitHubRepo, "--clobber")) -MaxAttempts 2
  if (-not $releaseUploaded) {
    Write-Step "Creating GitHub release $ReleaseTag in $GitHubRepo..."
    $releaseCreated = Invoke-GitHubCliWithRetry -Arguments (@("release", "create", $ReleaseTag) + $publishAssetPaths + @("--repo", $GitHubRepo, "--title", $ReleaseTitle, "--notes", "Gymmin Android APK build."))
  }
} else {
  Write-Step "Uploading versioned APK and latest alias to existing GitHub release $ReleaseTag in $GitHubRepo..."
  $releaseUploaded = Invoke-GitHubCliWithRetry -Arguments (@("release", "upload", $ReleaseTag) + $publishAssetPaths + @("--repo", $GitHubRepo, "--clobber"))
}

if (-not $releaseCreated -and -not $releaseUploaded) {
  throw "Could not upload APK to GitHub release $ReleaseTag."
}

$releaseJson = Invoke-GitHubCliCaptureWithRetry -Arguments @("release", "view", $ReleaseTag, "--repo", $GitHubRepo, "--json", "url,assets")
if (-not $releaseJson) {
  throw "GitHub release was uploaded, but its metadata could not be verified."
}
$releaseMetadata = $releaseJson | ConvertFrom-Json
$releaseUrl = ([string]$releaseMetadata.url).Trim()
$localAssetSize = (Get-Item -LiteralPath $resolvedApkPath).Length
if (-not $releaseUrl) { throw "GitHub release verification returned no release URL." }
foreach ($publishedPath in $publishAssetPaths) {
  $assetName = [System.IO.Path]::GetFileName($publishedPath)
  $publishedAsset = $releaseMetadata.assets | Where-Object { $_.name -eq $assetName } | Select-Object -First 1
  if (-not $publishedAsset) {
    throw "GitHub release verification did not find the uploaded asset: $assetName"
  }
  if ([long]$publishedAsset.size -ne [long]$localAssetSize) {
    throw "Published APK size mismatch for ${assetName}: local=$localAssetSize remote=$($publishedAsset.size)"
  }
}

Set-Content -LiteralPath $downloadUrlFile -Value $releaseUrl

Write-Output ""
Write-Output "APK_PATH=$resolvedApkPath"
Write-Output "APK_DOWNLOAD_URL=$releaseUrl"
Write-Output "APK_DOWNLOAD_URL_FILE=$downloadUrlFile"
Write-Output "APK_REMOTE_ASSET=$([System.IO.Path]::GetFileName($resolvedApkPath))"
Write-Output "APK_REMOTE_LATEST_ASSET=$([System.IO.Path]::GetFileName($latestAliasPath))"
Write-Output "APK_REMOTE_SIZE=$localAssetSize"
