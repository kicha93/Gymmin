param(
  [string]$Architectures = "arm64-v8a",
  [string]$GitHubRepo = "kicha93/gymmin-apk",
  [string]$ReleaseTag = "",
  [string]$ReleaseTitle = "",
  [string]$CommitMessage = "",
  [string]$SigningEnvFile = "C:\secure\gymmin-upload-key-codex-20260701.env.ps1",
  [ValidateRange(1, 20)][int]$NetworkMaxAttempts = 6,
  [switch]$SkipGitSync,
  [switch]$SkipPublish
)

$ErrorActionPreference = "Stop"
$env:GIT_TERMINAL_PROMPT = "0"
$env:GH_PROMPT_DISABLED = "1"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mobileRoot = Join-Path $repoRoot "apps\mobile"
$appConfigPath = Join-Path $mobileRoot "app.json"
$artifactRoot = Join-Path $repoRoot ".artifacts"
$buildScript = Join-Path $PSScriptRoot "build-android-apk.ps1"
$publishScript = Join-Path $PSScriptRoot "publish-apk-github.ps1"
$manifestGuard = Join-Path $PSScriptRoot "validate-android-exported-components.mjs"

function Write-Step([string]$Message) { Write-Host "[github-apk-oneclick] $Message" }
function Assert-LastExitCode([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}
function Invoke-GitNetworkCommandWithRetry {
  param(
    [Parameter(Mandatory = $true)][ValidateSet("preflight", "push")][string]$Operation,
    [string]$Remote = "origin",
    [int]$MaxAttempts = $NetworkMaxAttempts
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      if ($Operation -eq "preflight") {
        git ls-remote --exit-code $Remote HEAD | Out-Null
      } else {
        git push
      }
      $exitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($exitCode -eq 0) { return }
    if ($attempt -lt $MaxAttempts) {
      $delaySeconds = [Math]::Min(15, $attempt * 5)
      Write-Step "Git $Operation attempt $attempt/$MaxAttempts failed; retrying in $delaySeconds seconds..."
      Start-Sleep -Seconds $delaySeconds
    }
  }

  throw "Git $Operation failed after $MaxAttempts attempts."
}
function Get-AndroidBuildTool([string]$FileName) {
  $sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
  if (-not $sdkRoot) { throw "ANDROID_HOME or ANDROID_SDK_ROOT is required." }
  $tool = Get-ChildItem -LiteralPath (Join-Path $sdkRoot "build-tools") -Recurse -Filter $FileName -File |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if (-not $tool) { throw "Android build tool was not found: $FileName" }
  return $tool.FullName
}

if (-not (Test-Path -LiteralPath $appConfigPath)) { throw "Expo app config was not found: $appConfigPath" }
$appConfig = Get-Content -LiteralPath $appConfigPath -Raw | ConvertFrom-Json
$appVersion = [string]$appConfig.expo.version
$versionCode = [int]$appConfig.expo.android.versionCode
$applicationId = [string]$appConfig.expo.android.package
if (-not $appVersion -or $versionCode -le 0 -or -not $applicationId) {
  throw "Expo version, Android versionCode, or package is invalid."
}
if (-not $ReleaseTag) { $ReleaseTag = "v$appVersion" }
if (-not $ReleaseTitle) { $ReleaseTitle = "Gymmin $appVersion" }
if (-not $CommitMessage) { $CommitMessage = "chore: publish Gymmin $appVersion build" }

Write-Step "Preparing Gymmin $appVersion (versionCode $versionCode, $applicationId)."
if (-not (Test-Path -LiteralPath $SigningEnvFile)) {
  throw "Release signing environment file was not found: $SigningEnvFile"
}
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw "JDK 17 is required." }
if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
  throw "ANDROID_HOME or ANDROID_SDK_ROOT is required."
}
Get-AndroidBuildTool "aapt.exe" | Out-Null
Get-AndroidBuildTool "apksigner.bat" | Out-Null

$gitRemote = "origin"
if (-not $SkipGitSync) {
  Write-Step "Checking Git branch, upstream, and remote connectivity before the build..."
  Push-Location $repoRoot
  try {
    $branch = (git branch --show-current).Trim()
    Assert-LastExitCode "Current Git branch detection"
    if (-not $branch) { throw "One-click Git sync requires a checked-out branch." }
    $upstreamRef = (git rev-parse --abbrev-ref --symbolic-full-name "@{upstream}").Trim()
    Assert-LastExitCode "Git upstream validation"
    if (-not $upstreamRef -or $upstreamRef -notmatch "^([^/]+)/") {
      throw "Could not determine the Git remote from upstream: $upstreamRef"
    }
    $gitRemote = $Matches[1]
    # Verify that the Git object database is writable before spending several
    # minutes on tests and Gradle. The probe is an unreachable tiny blob and is
    # safe for Git to prune later.
    $gitWriteProbe = [Guid]::NewGuid().ToString("N") | git hash-object -w --stdin
    Assert-LastExitCode "Git object database write preflight"
    if (-not $gitWriteProbe) { throw "Git object database write preflight returned no object id." }
    Invoke-GitNetworkCommandWithRetry -Operation preflight -Remote $gitRemote
  } finally { Pop-Location }
}

if (-not $SkipPublish) {
  Write-Step "Checking GitHub authentication and release repository connectivity before the build..."
  & $publishScript -GitHubRepo $GitHubRepo -ReleaseTag $ReleaseTag -ReleaseTitle $ReleaseTitle -GitHubMaxAttempts $NetworkMaxAttempts -CheckOnly
}

Push-Location $repoRoot
try {
  Write-Step "Checking dependency advisories..."
  npm run security:dependencies
  Assert-LastExitCode "Dependency audit"
  Write-Step "Checking Expo SDK patch alignment..."
  Push-Location $mobileRoot
  try {
    npx --no-install expo install --check
    if ($LASTEXITCODE -ne 0) {
      Write-Step "Aligning compatible Expo SDK patch dependencies automatically..."
      npx --no-install expo install --fix
      Assert-LastExitCode "Expo SDK patch alignment"
    }
    Write-Step "Running Expo Doctor..."
    npx --no-install expo-doctor
    Assert-LastExitCode "Expo Doctor"
  } finally { Pop-Location }
  Write-Step "Checking patch whitespace..."
  # One-click must never open Git's interactive pager. Otherwise a successful
  # whitespace check can stop at "(END)" and look like a failed build.
  # The command is read-only, so disabling safecrlf for this invocation only
  # suppresses noisy LF/CRLF conversion notices without changing repository
  # files or the user's Git configuration.
  git -c core.safecrlf=false --no-pager diff --check
  Assert-LastExitCode "git diff --check"
  Write-Step "Patch whitespace check passed."
} finally { Pop-Location }

Write-Step "Running full mobile gates and building the signed release APK..."
$output = & $buildScript -Variant release -Architectures $Architectures -SigningEnvFile $SigningEnvFile
$output | Write-Host
$apkLine = $output | Where-Object { $_ -is [string] -and $_.StartsWith("APK_PATH=") } | Select-Object -Last 1
if (-not $apkLine) { throw "APK build did not return an artifact path." }
$apkPath = $apkLine.Substring("APK_PATH=".Length)

Write-Step "Validating the final merged Android manifest..."
node $manifestGuard
Assert-LastExitCode "Merged Android manifest validation"

$architectureName = ($Architectures -replace '[^a-zA-Z0-9_-]+', '-').Trim('-')
if (-not $architectureName) { $architectureName = "android" }
New-Item -ItemType Directory -Path $artifactRoot -Force | Out-Null
$versionedApkPath = Join-Path $artifactRoot "Gymmin-$appVersion-vc$versionCode-$architectureName-release.apk"
Copy-Item -LiteralPath $apkPath -Destination $versionedApkPath -Force

Write-Step "Verifying APK package metadata and signing certificate..."
$aapt = Get-AndroidBuildTool "aapt.exe"
$badging = & $aapt dump badging $versionedApkPath
Assert-LastExitCode "APK package metadata validation"
$packageLine = $badging | Where-Object { $_ -like "package:*" } | Select-Object -First 1
if (-not $packageLine -or
    $packageLine -notmatch "name='$([regex]::Escape($applicationId))'" -or
    $packageLine -notmatch "versionCode='$versionCode'" -or
    $packageLine -notmatch "versionName='$([regex]::Escape($appVersion))'") {
  throw "APK metadata does not match app.json. Received: $packageLine"
}
$apksigner = Get-AndroidBuildTool "apksigner.bat"
& $apksigner verify --verbose --print-certs $versionedApkPath
Assert-LastExitCode "APK signature validation"

if (-not $SkipGitSync) {
  Write-Step "Committing and pushing the verified source state..."
  Push-Location $repoRoot
  try {
    $branch = (git branch --show-current).Trim()
    Assert-LastExitCode "Current Git branch detection"
    if (-not $branch) { throw "One-click Git sync requires a checked-out branch." }

    git rev-parse --abbrev-ref --symbolic-full-name "@{upstream}" | Out-Null
    Assert-LastExitCode "Git upstream validation"

    $pendingChanges = git status --porcelain --untracked-files=all
    Assert-LastExitCode "Git status"
    if ($pendingChanges) {
      git add --all
      Assert-LastExitCode "Git staging"
      git diff --cached --quiet
      if ($LASTEXITCODE -eq 1) {
        git commit -m $CommitMessage
        Assert-LastExitCode "Git commit"
      } elseif ($LASTEXITCODE -ne 0) {
        throw "Staged Git diff check failed with exit code $LASTEXITCODE."
      }
    } else {
      Write-Step "No source changes require a new commit."
    }

    Invoke-GitNetworkCommandWithRetry -Operation push -Remote $gitRemote
  } finally { Pop-Location }
}

if (-not $SkipPublish) {
  Write-Step "Publishing the verified APK to GitHub Release $ReleaseTag..."
  try {
    & $publishScript -ApkPath $versionedApkPath -GitHubRepo $GitHubRepo -ReleaseTag $ReleaseTag -ReleaseTitle $ReleaseTitle -GitHubMaxAttempts $NetworkMaxAttempts
  } catch {
    Write-Step "The verified APK remains available at: $versionedApkPath"
    Write-Step "After connectivity returns, resume only publication with: npm run mobile:apk:publish-github -- -ApkPath `"$versionedApkPath`" -GitHubRepo $GitHubRepo -ReleaseTag $ReleaseTag -ReleaseTitle `"$ReleaseTitle`""
    throw
  }
}

Write-Output "APK_PATH=$versionedApkPath"
Write-Output "APP_VERSION=$appVersion"
Write-Output "VERSION_CODE=$versionCode"
Write-Output "APPLICATION_ID=$applicationId"
