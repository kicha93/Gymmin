param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [string]$Architectures = "arm64-v8a",
  [string]$SubstDrive = "G:",
  [int]$DownloadPort = 8095,
  [ValidateSet("GitHub", "Ngrok", "Cloudflare")]
  [string]$PublishProvider = "GitHub",
  [ValidateSet("Ngrok", "Cloudflare")]
  [string]$TunnelProvider = "Ngrok",
  [string]$GitHubRepo = "kicha93/gymmin-apk",
  [string]$ReleaseTag = "v1.0",
  [string]$ReleaseTitle = "Gymmin 1.0",
  [switch]$SkipTypecheck,
  [switch]$SkipPublish
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mobileRoot = Join-Path $repoRoot "apps\mobile"
$androidRoot = Join-Path $mobileRoot "android"
$workspaceSdk = Join-Path $repoRoot ".android-sdk"
$artifactsRoot = Join-Path $repoRoot ".artifacts"
$downloadUrlFile = Join-Path $artifactsRoot "latest-apk-download-url.txt"
$mobileBuildConfigPath = Join-Path $mobileRoot "src\config\buildConfig.ts"

function Write-Step {
  param([string]$Message)
  Write-Host "[phone-apk] $Message"
}

function Write-MobileBuildConfig {
  param([string]$ApiUrl)

  $encodedApiUrl = $ApiUrl | ConvertTo-Json -Compress
  Set-Content `
    -Path $mobileBuildConfigPath `
    -Value "export const BUILD_API_BASE_URL = $encodedApiUrl;" `
    -Encoding UTF8
}

function Assert-Command {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$InstallHint
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing command '$Name'. $InstallHint"
  }
}

function Ensure-SubstDrive {
  param(
    [string]$Drive,
    [string]$TargetPath
  )

  $driveName = $Drive.TrimEnd(":")
  $existing = subst | Select-String -Pattern "^$([regex]::Escape($driveName)):\\:"
  if ($existing) {
    return
  }

  subst $Drive $TargetPath
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

function Publish-ApkToGitHubRelease {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ApkPath,
    [Parameter(Mandatory = $true)]
    [string]$Repository,
    [Parameter(Mandatory = $true)]
    [string]$Tag,
    [Parameter(Mandatory = $true)]
    [string]$Title
  )

  $gh = Get-GitHubCliPath

  & $gh auth status *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI is not authenticated. Run: $gh auth login --hostname github.com --git-protocol https --web --scopes repo"
  }

  & $gh repo view $Repository *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Step "Creating private GitHub repository: $Repository"
    & $gh repo create $Repository --private --description "Gymmin Android APK builds" --add-readme
    if ($LASTEXITCODE -ne 0) {
      throw "Could not create GitHub repository: $Repository"
    }
  }

  $releaseExists = $true
  & $gh release view $Tag --repo $Repository *> $null
  if ($LASTEXITCODE -ne 0) {
    $releaseExists = $false
  }

  if (-not $releaseExists) {
    Write-Step "Creating GitHub release $Tag in $Repository..."
    & $gh release create $Tag $ApkPath --repo $Repository --title $Title --notes "Gymmin Android APK build."
  } else {
    Write-Step "Uploading APK to existing GitHub release $Tag in $Repository..."
    & $gh release upload $Tag $ApkPath --repo $Repository --clobber
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Could not upload APK to GitHub release $Tag."
  }

  $releaseUrl = (& $gh release view $Tag --repo $Repository --json url --jq ".url").Trim()
  if (-not $releaseUrl) {
    throw "GitHub release was uploaded, but release URL could not be resolved."
  }

  return $releaseUrl
}

$normalizedApiBaseUrl = $ApiBaseUrl.Trim().TrimEnd("/")
if (-not ($normalizedApiBaseUrl -match "^https?://")) {
  throw "ApiBaseUrl must start with http:// or https://. Received: $ApiBaseUrl"
}

Assert-Command "java" "Install JDK 17, for example: winget install EclipseAdoptium.Temurin.17.JDK"

if (-not $env:ANDROID_SDK_ROOT -and -not $env:ANDROID_HOME -and (Test-Path $workspaceSdk)) {
  $env:ANDROID_SDK_ROOT = $workspaceSdk
  $env:ANDROID_HOME = $workspaceSdk
}

if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
  throw "ANDROID_HOME or ANDROID_SDK_ROOT is not set. Install Android SDK or run the existing local SDK setup first."
}

if (-not (Test-Path $androidRoot)) {
  Write-Step "Generating native Android project with Expo prebuild..."
  Push-Location $mobileRoot
  try {
    npx expo prebuild --platform android --no-install
  } finally {
    Pop-Location
  }
}

if (-not $SkipTypecheck) {
  Write-Step "Running TypeScript check..."
  Push-Location $mobileRoot
  try {
    npm run typecheck
  } finally {
    Pop-Location
  }
}

New-Item -ItemType Directory -Path $artifactsRoot -Force | Out-Null
Ensure-SubstDrive -Drive $SubstDrive -TargetPath $repoRoot

$substRoot = "$SubstDrive\"
$substAndroidRoot = Join-Path $substRoot "apps\mobile\android"
$env:EXPO_PUBLIC_API_BASE_URL = $normalizedApiBaseUrl
$env:NODE_ENV = "production"
Write-MobileBuildConfig -ApiUrl $normalizedApiBaseUrl

if ($env:ANDROID_SDK_ROOT -like "$repoRoot*") {
  $env:ANDROID_SDK_ROOT = $env:ANDROID_SDK_ROOT.Replace($repoRoot, $substRoot.TrimEnd("\"))
  $env:ANDROID_HOME = $env:ANDROID_SDK_ROOT
}

Write-Step "Backend URL embedded in APK: $normalizedApiBaseUrl"
Write-Step "Architectures: $Architectures"
Write-Step "Building release APK from short path: $substAndroidRoot"

Push-Location $substAndroidRoot
try {
  .\gradlew.bat assembleRelease "-PreactNativeArchitectures=$Architectures"
} finally {
  Pop-Location
}

$apkPath = Join-Path $androidRoot "app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $apkPath)) {
  throw "APK was not found at expected path: $apkPath"
}

$safeArchitectureName = ($Architectures -replace "[^a-zA-Z0-9_-]+", "-").Trim("-")
if (-not $safeArchitectureName) {
  $safeArchitectureName = "android"
}

$artifactPath = Join-Path $artifactsRoot "Gymmin-$safeArchitectureName-release-latest.apk"
Copy-Item -Path $apkPath -Destination $artifactPath -Force

$artifact = Get-Item $artifactPath
Write-Step "APK ready: $($artifact.FullName)"
Write-Step "APK size: $([math]::Round($artifact.Length / 1MB, 2)) MB"

if ($SkipPublish) {
  Write-Output "APK_PATH=$($artifact.FullName)"
  return
}

Remove-Item $downloadUrlFile -Force -ErrorAction SilentlyContinue

if ($PublishProvider -eq "GitHub") {
  Write-Step "Publishing APK to GitHub release..."
  $downloadUrl = Publish-ApkToGitHubRelease -ApkPath $artifact.FullName -Repository $GitHubRepo -Tag $ReleaseTag -Title $ReleaseTitle
  Set-Content -LiteralPath $downloadUrlFile -Value $downloadUrl
  Write-Output ""
  Write-Output "APK_PATH=$($artifact.FullName)"
  Write-Output "APK_DOWNLOAD_URL=$downloadUrl"
  Write-Output "APK_DOWNLOAD_URL_FILE=$downloadUrlFile"
  return
}

Write-Step "Starting public APK download tunnel..."
& (Join-Path $PSScriptRoot "start-apk-download.ps1") -ApkPath $artifactPath -Port $DownloadPort -UrlOutputPath $downloadUrlFile -TunnelProvider $PublishProvider

if (Test-Path $downloadUrlFile) {
  $downloadUrl = (Get-Content $downloadUrlFile -Raw).Trim()
  if ($downloadUrl) {
    Write-Output ""
    Write-Output "APK_PATH=$($artifact.FullName)"
    Write-Output "APK_DOWNLOAD_URL=$downloadUrl"
    Write-Output "APK_DOWNLOAD_URL_FILE=$downloadUrlFile"
  }
}
