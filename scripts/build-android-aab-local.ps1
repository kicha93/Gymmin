param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [string]$ShortBuildRoot = "C:\gymmin-aab",
  [switch]$SkipTypecheck
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mobileRoot = Join-Path $repoRoot "apps\mobile"
$shortRoot = $ShortBuildRoot.TrimEnd("\")
$shortRepoRoot = Join-Path $shortRoot "repo"
$markerPath = Join-Path $shortRoot ".gymmin-aab-build-root"
$artifactDir = Join-Path $repoRoot ".artifacts"
$artifactPath = Join-Path $artifactDir "Gymmin-release-latest.aab"

function Write-Step {
  param([string]$Message)
  Write-Host "[local-aab] $Message"
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

function Get-LocalUploadSigningProperty {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $propertiesPath = Join-Path $mobileRoot "android\upload-keystore.properties"
  if (-not (Test-Path $propertiesPath)) {
    return $null
  }

  $line = Get-Content $propertiesPath -ErrorAction Stop |
    Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } |
    Select-Object -First 1

  if (-not $line) {
    return $null
  }

  return (($line -split "=", 2)[1]).Trim()
}

function Assert-ReleaseSigningConfigured {
  $required = @(
    "GYMMIN_UPLOAD_STORE_FILE",
    "GYMMIN_UPLOAD_STORE_PASSWORD",
    "GYMMIN_UPLOAD_KEY_ALIAS",
    "GYMMIN_UPLOAD_KEY_PASSWORD"
  )

  $missing = @()
  foreach ($name in $required) {
    $value = [Environment]::GetEnvironmentVariable($name)
    if (-not $value) {
      $value = Get-LocalUploadSigningProperty -Name $name
    }

    if (-not $value) {
      $missing += $name
    }
  }

  if ($missing.Count -gt 0) {
    throw "Release signing is not configured. Missing: $($missing -join ', '). Set these as environment variables or in apps/mobile/android/upload-keystore.properties. Release AAB builds must not use the debug keystore."
  }
}

function Assert-ProductionApiBaseUrl {
  param([Parameter(Mandatory = $true)][string]$Url)

  $uri = $null
  if (-not [System.Uri]::TryCreate($Url, [System.UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -ne "https") {
    throw "Store ApiBaseUrl must be an absolute HTTPS URL. Received: $Url"
  }

  $hostName = $uri.DnsSafeHost.ToLowerInvariant()
  $forbiddenHosts = @("localhost", "127.0.0.1", "10.0.2.2")
  $forbiddenSuffixes = @(".trycloudflare.com", ".ngrok-free.app", ".ngrok.app", ".ngrok.io", ".loca.lt")
  if ($hostName -in $forbiddenHosts -or ($forbiddenSuffixes | Where-Object { $hostName.EndsWith($_) })) {
    throw "Store builds cannot use a temporary tunnel or local backend URL: $Url"
  }
}

function Write-MobileBuildConfig {
  param(
    [Parameter(Mandatory = $true)]
    [string]$MobileRoot,
    [Parameter(Mandatory = $true)]
    [string]$ApiUrl
  )

  $configPath = Join-Path $MobileRoot "src\config\buildConfig.ts"
  $encodedApiUrl = $ApiUrl | ConvertTo-Json -Compress
  Set-Content `
    -Path $configPath `
    -Value "export const BUILD_API_BASE_URL = $encodedApiUrl;" `
    -Encoding UTF8
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

$normalizedApiBaseUrl = $ApiBaseUrl.Trim().TrimEnd("/")
if (-not ($normalizedApiBaseUrl -match "^https?://")) {
  throw "ApiBaseUrl must start with http:// or https://. Received: $ApiBaseUrl"
}
Assert-ProductionApiBaseUrl -Url $normalizedApiBaseUrl

Assert-Command "java" "Install JDK 17, for example: winget install EclipseAdoptium.Temurin.17.JDK"
Assert-ReleaseSigningConfigured

if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
  throw "ANDROID_HOME or ANDROID_SDK_ROOT is not set. Install Android Studio or Android command-line tools and set the SDK path."
}

if (Test-Path $shortRoot) {
  if (-not (Test-Path $markerPath)) {
    throw "ShortBuildRoot exists but is not marked as a Gymmin AAB build folder: $shortRoot"
  }
} else {
  New-Item -ItemType Directory -Path $shortRoot | Out-Null
  Set-Content -Path $markerPath -Value "Gymmin Android AAB short-path build folder" -Encoding UTF8
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

$copiedMobileRoot = Join-Path $shortRepoRoot "apps\mobile"
$copiedAndroidRoot = Join-Path $copiedMobileRoot "android"
Clear-AndroidBuildCaches -CopiedMobileRoot $copiedMobileRoot
Write-MobileBuildConfig -MobileRoot $copiedMobileRoot -ApiUrl $normalizedApiBaseUrl

Write-Step "Building release AAB from short path..."
Push-Location $copiedAndroidRoot
try {
  $env:NODE_ENV = "production"
  .\gradlew.bat bundleRelease
} finally {
  Pop-Location
}

$builtAabPath = Join-Path $copiedAndroidRoot "app\build\outputs\bundle\release\app-release.aab"
if (-not (Test-Path $builtAabPath)) {
  throw "AAB was not found at expected path: $builtAabPath"
}

New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
Copy-Item -LiteralPath $builtAabPath -Destination $artifactPath -Force

Write-Step "AAB ready: $artifactPath"
