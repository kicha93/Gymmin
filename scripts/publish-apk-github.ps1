param(
  [string]$ApkPath = "",
  [string]$GitHubRepo = "kicha93/Gymmin",
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
$versionCode = [int]$appConfig.expo.android.versionCode

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
$apkSha256 = (Get-FileHash -LiteralPath $resolvedApkPath -Algorithm SHA256).Hash.ToLowerInvariant()
$apkDigestSuffix = $apkSha256.Substring(0, 12)
if (-not $ReleaseTag) { $ReleaseTag = "android-v$appVersion-vc$versionCode-$apkDigestSuffix" }
if (-not $ReleaseTitle) { $ReleaseTitle = "Gymmin $appVersion for Android ($apkDigestSuffix)" }
$releaseNotes = @"
## Gymmin $appVersion for Android

Download Gymmin-arm64-v8a-release.apk to install the verified, signed Android build directly.

### Installation

1. Download the APK directly on an Android phone.
2. Allow installation from the browser when Android asks.
3. Open the downloaded APK and install it.

This release is immutable and identified by APK SHA-256 `$apkSha256`. The one-click pipeline never replaces this asset in place, so an in-progress download cannot be invalidated by a later publication.
"@

$latestAliasPath = Join-Path $artifactsRoot "Gymmin-arm64-v8a-release.apk"
if (-not [string]::Equals(
  [System.IO.Path]::GetFullPath($resolvedApkPath),
  [System.IO.Path]::GetFullPath($latestAliasPath),
  [System.StringComparison]::OrdinalIgnoreCase
)) {
  Copy-Item -LiteralPath $resolvedApkPath -Destination $latestAliasPath -Force
}
$publishAssetPaths = @($resolvedApkPath, $latestAliasPath) | Select-Object -Unique

$releaseCreated = $false
$releaseExists = Invoke-GitHubCliWithRetry -Arguments @("release", "view", $ReleaseTag, "--repo", $GitHubRepo) -MaxAttempts 3 -Silent

if (-not $releaseExists) {
  Write-Step "Creating immutable GitHub release $ReleaseTag in $GitHubRepo..."
  $releaseCreated = Invoke-GitHubCliWithRetry -Arguments (@("release", "create", $ReleaseTag) + $publishAssetPaths + @("--repo", $GitHubRepo, "--title", $ReleaseTitle, "--notes", $releaseNotes, "--latest")) -MaxAttempts 2
  if (-not $releaseCreated) {
    # Creation may race with a retry that succeeded after its response was lost.
    $releaseExists = Invoke-GitHubCliWithRetry -Arguments @("release", "view", $ReleaseTag, "--repo", $GitHubRepo) -MaxAttempts 3 -Silent
  }
} else {
  Write-Step "Immutable GitHub release $ReleaseTag already exists; verifying it without replacing assets."
}

if (-not $releaseCreated -and -not $releaseExists) {
  throw "Could not create or verify immutable GitHub release $ReleaseTag."
}

if (-not (Invoke-GitHubCliWithRetry -Arguments @("release", "edit", $ReleaseTag, "--repo", $GitHubRepo, "--title", $ReleaseTitle, "--notes", $releaseNotes, "--latest"))) {
  throw "APK was uploaded, but the public release description could not be updated."
}

$releaseJson = Invoke-GitHubCliCaptureWithRetry -Arguments @("release", "view", $ReleaseTag, "--repo", $GitHubRepo, "--json", "url,assets")
if (-not $releaseJson) {
  throw "GitHub release was uploaded, but its metadata could not be verified."
}
$releaseMetadata = $releaseJson | ConvertFrom-Json
$releaseUrl = ([string]$releaseMetadata.url).Trim()
if (-not $releaseUrl) { throw "GitHub release verification returned no release URL." }
foreach ($publishedPath in $publishAssetPaths) {
  $assetName = [System.IO.Path]::GetFileName($publishedPath)
  $localAssetSize = (Get-Item -LiteralPath $publishedPath).Length
  $publishedAsset = $releaseMetadata.assets | Where-Object { $_.name -eq $assetName } | Select-Object -First 1
  if (-not $publishedAsset) {
    throw "GitHub release verification did not find the uploaded asset: $assetName"
  }
  if ([long]$publishedAsset.size -ne [long]$localAssetSize) {
    throw "Published APK size mismatch for ${assetName}: local=$localAssetSize remote=$($publishedAsset.size)"
  }
  $localDigest = "sha256:$((Get-FileHash -LiteralPath $publishedPath -Algorithm SHA256).Hash.ToLowerInvariant())"
  if ($publishedAsset.digest -and -not [string]::Equals([string]$publishedAsset.digest, $localDigest, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Published APK digest mismatch for ${assetName}: local=$localDigest remote=$($publishedAsset.digest)"
  }
}

Set-Content -LiteralPath $downloadUrlFile -Value $releaseUrl

Write-Output ""
Write-Output "APK_PATH=$resolvedApkPath"
Write-Output "APK_DOWNLOAD_URL=$releaseUrl"
Write-Output "APK_DOWNLOAD_URL_FILE=$downloadUrlFile"
Write-Output "APK_REMOTE_ASSET=$([System.IO.Path]::GetFileName($resolvedApkPath))"
Write-Output "APK_REMOTE_LATEST_ASSET=$([System.IO.Path]::GetFileName($latestAliasPath))"
Write-Output "APK_REMOTE_SIZE=$((Get-Item -LiteralPath $resolvedApkPath).Length)"
Write-Output "APK_SHA256=$apkSha256"
Write-Output "APK_DIRECT_URL=https://github.com/$GitHubRepo/releases/latest/download/$([System.IO.Path]::GetFileName($latestAliasPath))"
