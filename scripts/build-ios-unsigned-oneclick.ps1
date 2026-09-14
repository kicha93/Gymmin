param(
  [string]$SourceRepo = "kicha93/Gymmin",
  [ValidateRange(1, 20)][int]$NetworkMaxAttempts = 6,
  [switch]$SkipValidation,
  [switch]$SkipGitSync
)

$ErrorActionPreference = "Stop"
$env:GIT_TERMINAL_PROMPT = "0"
$env:GH_PROMPT_DISABLED = "1"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mobileRoot = Join-Path $repoRoot "apps\mobile"
$artifactRoot = Join-Path $repoRoot ".artifacts"
$workflowName = "ios-unsigned.yml"

function Write-Step([string]$Message) { Write-Host "[ios-unsigned] $Message" }
function Assert-LastExitCode([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}
function Get-GitHubCliPath {
  $command = Get-Command gh -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $portable = Join-Path $repoRoot ".tools\gh\bin\gh.exe"
  if (Test-Path -LiteralPath $portable) { return $portable }
  throw "GitHub CLI was not found."
}
function Invoke-GhRetry {
  param([Parameter(Mandatory = $true)][string[]]$Arguments, [switch]$Capture)
  for ($attempt = 1; $attempt -le $NetworkMaxAttempts; $attempt++) {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      if ($Capture) { $result = & $gh @Arguments 2>$null } else { & $gh @Arguments | Out-Host }
      $exitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($exitCode -eq 0) {
      if ($Capture) { return ($result | Out-String).Trim() }
      return
    }
    if ($attempt -lt $NetworkMaxAttempts) { Start-Sleep -Seconds ([Math]::Min(15, $attempt * 3)) }
  }
  throw "GitHub command failed: gh $($Arguments -join ' ')"
}

$gh = Get-GitHubCliPath
$appConfig = Get-Content -LiteralPath (Join-Path $mobileRoot "app.json") -Raw | ConvertFrom-Json
$appVersion = [string]$appConfig.expo.version
$buildNumber = [string]$appConfig.expo.ios.buildNumber
if (-not $appVersion -or -not $buildNumber) { throw "Missing iOS version or build number in app.json." }
Write-Step "Checking GitHub access..."
& $gh auth status *> $null
Assert-LastExitCode "GitHub authentication"
Invoke-GhRetry -Arguments @("repo", "view", $SourceRepo) | Out-Null

if (-not $SkipValidation) {
  Write-Step "Running mobile validation gates..."
  Push-Location $repoRoot
  try {
    npm run security:dependencies
    Assert-LastExitCode "Dependency audit"
    Push-Location $mobileRoot
    try {
      npx --no-install expo install --check
      Assert-LastExitCode "Expo dependency alignment"
      npx --no-install expo-doctor
      Assert-LastExitCode "Expo Doctor"
      npm test
      Assert-LastExitCode "Mobile tests"
      npm run typecheck
      Assert-LastExitCode "TypeScript check"
    } finally { Pop-Location }
    git -c core.safecrlf=false --no-pager diff --check
    Assert-LastExitCode "Git patch whitespace check"
  } finally { Pop-Location }
}

Push-Location $repoRoot
try {
  $branch = (git branch --show-current).Trim()
  Assert-LastExitCode "Git branch detection"
  if (-not $branch) { throw "A checked-out Git branch is required." }

  if (-not $SkipGitSync) {
    Write-Step "Pushing the current committed source..."
    git push origin $branch
    Assert-LastExitCode "Git push"
  }

  $headSha = (git rev-parse HEAD).Trim()
  Assert-LastExitCode "Git HEAD detection"
  Write-Step "Starting the unsigned iOS build on GitHub macOS..."
  Invoke-GhRetry -Arguments @("workflow", "run", $workflowName, "--repo", $SourceRepo, "--ref", $branch)

  $runId = ""
  for ($attempt = 1; $attempt -le 30 -and -not $runId; $attempt++) {
    Start-Sleep -Seconds 3
    $runsJson = Invoke-GhRetry -Arguments @("run", "list", "--repo", $SourceRepo, "--workflow", $workflowName, "--event", "workflow_dispatch", "--limit", "10", "--json", "databaseId,headSha") -Capture
    $matchingRun = ($runsJson | ConvertFrom-Json | Where-Object { $_.headSha -eq $headSha } | Select-Object -First 1)
    if ($matchingRun) { $runId = [string]$matchingRun.databaseId }
  }
  if (-not $runId) { throw "Could not identify the dispatched iOS workflow run." }

  Write-Step "Waiting for GitHub Actions run $runId..."
  & $gh run watch $runId --repo $SourceRepo --exit-status
  Assert-LastExitCode "Unsigned iOS GitHub Actions build"

  $downloadRoot = Join-Path $artifactRoot "ios-unsigned-$runId"
  New-Item -ItemType Directory -Path $downloadRoot -Force | Out-Null
  Invoke-GhRetry -Arguments @("run", "download", $runId, "--repo", $SourceRepo, "--name", "gymmin-ios-unsigned", "--dir", $downloadRoot)
  $downloadedIpa = Get-ChildItem -LiteralPath $downloadRoot -Filter "*.ipa" -File | Select-Object -First 1
  if (-not $downloadedIpa) { throw "GitHub artifact did not contain an IPA." }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead($downloadedIpa.FullName)
  try {
    $entryNames = @($archive.Entries | ForEach-Object FullName)
    if (-not ($entryNames | Where-Object { $_ -match '^Payload/[^/]+\.app/' })) { throw "IPA has no Payload application bundle." }
    if ($entryNames | Where-Object { $_ -match 'embedded\.mobileprovision$|/_CodeSignature/' }) { throw "IPA unexpectedly contains Apple signing data." }
  } finally { $archive.Dispose() }

  New-Item -ItemType Directory -Path $artifactRoot -Force | Out-Null
  $versionedIpa = Join-Path $artifactRoot "Gymmin-$appVersion-build$buildNumber-unsigned.ipa"
  $latestIpa = Join-Path $artifactRoot "Gymmin-ios-unsigned-latest.ipa"
  Copy-Item -LiteralPath $downloadedIpa.FullName -Destination $versionedIpa -Force
  Copy-Item -LiteralPath $downloadedIpa.FullName -Destination $latestIpa -Force
  $hash = (Get-FileHash -LiteralPath $versionedIpa -Algorithm SHA256).Hash.ToLowerInvariant()
  $runUrl = Invoke-GhRetry -Arguments @("run", "view", $runId, "--repo", $SourceRepo, "--json", "url", "--jq", ".url") -Capture
} finally { Pop-Location }

Write-Output "IOS_UNSIGNED_BUILD=OK"
Write-Output "IPA_PATH=$versionedIpa"
Write-Output "IPA_ARTIFACT_URL=$runUrl"
Write-Output "IPA_SHA256=$hash"
