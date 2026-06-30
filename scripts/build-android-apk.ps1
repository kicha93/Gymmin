param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [string]$Profile = "preview-apk",
  [switch]$SkipTypecheck,
  [switch]$NonInteractive,
  [switch]$ValidateOnly
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mobileRoot = Join-Path $repoRoot "apps\mobile"
$easJsonPath = Join-Path $mobileRoot "eas.json"

function Write-Step {
  param([string]$Message)
  Write-Host "[apk] $Message"
}

if (-not (Test-Path $easJsonPath)) {
  throw "Missing EAS config: $easJsonPath"
}

$normalizedApiBaseUrl = $ApiBaseUrl.Trim().TrimEnd("/")
if (-not ($normalizedApiBaseUrl -match "^https?://")) {
  throw "ApiBaseUrl must start with http:// or https://. Received: $ApiBaseUrl"
}

$easJsonBackup = Get-Content $easJsonPath -Raw

try {
  $easConfig = $easJsonBackup | ConvertFrom-Json
  $profileConfig = $easConfig.build.$Profile

  if (-not $profileConfig) {
    throw "EAS build profile '$Profile' was not found in $easJsonPath"
  }

  if (-not $profileConfig.env) {
    $profileConfig | Add-Member -MemberType NoteProperty -Name env -Value ([pscustomobject]@{})
  }

  $profileConfig.env | Add-Member `
    -MemberType NoteProperty `
    -Name EXPO_PUBLIC_API_BASE_URL `
    -Value $normalizedApiBaseUrl `
    -Force

  $easConfig | ConvertTo-Json -Depth 20 | Set-Content -Path $easJsonPath -Encoding UTF8

  Write-Step "Mobile root: $mobileRoot"
  Write-Step "EAS profile: $Profile"
  Write-Step "Backend URL embedded in APK: $normalizedApiBaseUrl"

  if (-not $SkipTypecheck) {
    Write-Step "Running TypeScript check..."
    Push-Location $mobileRoot
    try {
      npm run typecheck
    } finally {
      Pop-Location
    }
  }

  $easArgs = @("eas-cli@latest", "build", "--platform", "android", "--profile", $Profile)

  if ($NonInteractive) {
    $easArgs += "--non-interactive"
  }

  Write-Step "Build command: npx $($easArgs -join ' ')"

  if ($ValidateOnly) {
    Write-Step "ValidateOnly enabled. EAS build was not started."
    return
  }

  Push-Location $mobileRoot
  try {
    $buildArgs = @("eas-cli@latest", "build", "--platform", "android", "--profile", $Profile)
    if ($NonInteractive) {
      $buildArgs += "--non-interactive"
    }

    npx @buildArgs
  } finally {
    Pop-Location
  }
} finally {
  Set-Content -Path $easJsonPath -Value $easJsonBackup -Encoding UTF8
  Write-Step "Restored eas.json."
}
