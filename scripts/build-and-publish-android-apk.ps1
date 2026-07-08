param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [string]$Architectures = "arm64-v8a",
  [string]$ShortBuildRoot = "C:\gymmin-apk",
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
$shortRoot = $ShortBuildRoot.TrimEnd("\")
$shortRepoRoot = Join-Path $shortRoot "repo"
$shortMarkerPath = Join-Path $shortRoot ".gymmin-apk-build-root"

function Write-Step {
  param([string]$Message)
  Write-Host "[phone-apk] $Message"
}

function Write-MobileBuildConfig {
  param(
    [string]$ApiUrl,
    [string]$ConfigPath = $mobileBuildConfigPath
  )

  $encodedApiUrl = $ApiUrl | ConvertTo-Json -Compress
  Set-Content `
    -Path $ConfigPath `
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

function Copy-ArtifactWithRetry {
  param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,
    [Parameter(Mandatory = $true)]
    [string]$DestinationPath,
    [int]$Attempts = 8,
    [int]$DelayMilliseconds = 750
  )

  $destinationDirectory = Split-Path -Parent $DestinationPath
  if (-not (Test-Path $destinationDirectory)) {
    New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
  }

  $temporaryDestinationPath = Join-Path $destinationDirectory (
    "{0}.{1}.tmp" -f ([System.IO.Path]::GetFileName($DestinationPath)), ([System.Guid]::NewGuid().ToString("N"))
  )

  Copy-Item -LiteralPath $SourcePath -Destination $temporaryDestinationPath -Force

  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      if (Test-Path $DestinationPath) {
        Remove-Item -LiteralPath $DestinationPath -Force
      }

      Move-Item -LiteralPath $temporaryDestinationPath -Destination $DestinationPath -Force
      return
    } catch {
      if ($attempt -ge $Attempts) {
        Remove-Item -LiteralPath $temporaryDestinationPath -Force -ErrorAction SilentlyContinue
        throw "Could not replace APK artifact '$DestinationPath'. Close any app that may have this file open (Explorer preview, browser download, antivirus scan, previous upload/download server) and run the build again. Details: $($_.Exception.Message)"
      }

      Write-Step "APK artifact is locked, retrying copy ($attempt/$Attempts)..."
      Start-Sleep -Milliseconds $DelayMilliseconds
    }
  }
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

function Clear-AndroidBuildCaches {
  param([Parameter(Mandatory = $true)][string]$CopiedMobileRoot)

  $targets = @(
    (Join-Path $CopiedMobileRoot "android\build"),
    (Join-Path $CopiedMobileRoot "android\.gradle"),
    (Join-Path $CopiedMobileRoot "android\app\build"),
    (Join-Path $CopiedMobileRoot "android\app\.cxx")
  )

  foreach ($target in $targets) {
    if (Test-Path $target) {
      Remove-Item -LiteralPath $target -Recurse -Force
    }
  }

  $nodeModules = Join-Path $CopiedMobileRoot "node_modules"
  if (Test-Path $nodeModules) {
    Get-ChildItem -Path $nodeModules -Recurse -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -in @("build", ".gradle", ".cxx") -and $_.FullName -match "\\android(\\|$)" } |
      Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Copy-RepoToShortBuildPath {
  if (Test-Path $shortRoot) {
    if (-not (Test-Path $shortMarkerPath)) {
      throw "ShortBuildRoot exists but is not marked as a Gymmin APK build folder: $shortRoot"
    }
  } else {
    New-Item -ItemType Directory -Path $shortRoot | Out-Null
    Set-Content -Path $shortMarkerPath -Value "Gymmin Android APK short-path build folder" -Encoding UTF8
  }

  Write-Step "Copying repo to short build path: $shortRepoRoot"
  robocopy `
    $repoRoot `
    $shortRepoRoot `
    /MIR `
    /XD .git .artifacts .android-sdk apps\mobile\android\build backend\Gymmin.Api\bin backend\Gymmin.Api\obj backend\Gymmin.Api.Tests\bin backend\Gymmin.Api.Tests\obj `
    /XF *.apk *.aab | Out-Host
  if ($LASTEXITCODE -gt 7) {
    throw "robocopy failed with exit code $LASTEXITCODE"
  }
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
$env:EXPO_PUBLIC_API_BASE_URL = $normalizedApiBaseUrl
$env:NODE_ENV = "production"
Write-MobileBuildConfig -ApiUrl $normalizedApiBaseUrl

Copy-RepoToShortBuildPath

$shortMobileRoot = Join-Path $shortRepoRoot "apps\mobile"
$shortAndroidRoot = Join-Path $shortMobileRoot "android"
$shortBuildConfigPath = Join-Path $shortMobileRoot "src\config\buildConfig.ts"
Clear-AndroidBuildCaches -CopiedMobileRoot $shortMobileRoot
Write-MobileBuildConfig -ApiUrl $normalizedApiBaseUrl -ConfigPath $shortBuildConfigPath

Write-Step "Backend URL embedded in APK: $normalizedApiBaseUrl"
Write-Step "Architectures: $Architectures"
Write-Step "Building release APK from short path: $shortAndroidRoot"

Push-Location $shortAndroidRoot
try {
  .\gradlew.bat assembleRelease "-PreactNativeArchitectures=$Architectures"
} finally {
  Pop-Location
}

$apkPath = Join-Path $shortAndroidRoot "app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $apkPath)) {
  throw "APK was not found at expected path: $apkPath"
}

$safeArchitectureName = ($Architectures -replace "[^a-zA-Z0-9_-]+", "-").Trim("-")
if (-not $safeArchitectureName) {
  $safeArchitectureName = "android"
}

$artifactPath = Join-Path $artifactsRoot "Gymmin-$safeArchitectureName-release-latest.apk"
Copy-ArtifactWithRetry -SourcePath $apkPath -DestinationPath $artifactPath

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
