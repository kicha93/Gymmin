[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$AdminConnectionUri,

    [Parameter(Mandatory = $true)]
    [string]$BackupPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not [Uri]::TryCreate($AdminConnectionUri, [UriKind]::Absolute, [ref]$null) -or
    (-not $AdminConnectionUri.StartsWith('postgresql://', [System.StringComparison]::OrdinalIgnoreCase) -and
     -not $AdminConnectionUri.StartsWith('postgres://', [System.StringComparison]::OrdinalIgnoreCase))) {
    throw 'AdminConnectionUri must be a PostgreSQL URI (postgresql://...).'
}

$adminUriBuilder = [UriBuilder]::new([Uri]$AdminConnectionUri)
$connectionPassword = if ([string]::IsNullOrEmpty($adminUriBuilder.Password)) {
    $null
} else {
    [Uri]::UnescapeDataString($adminUriBuilder.Password)
}
$adminUriBuilder.Password = ''
$safeAdminConnectionUri = $adminUriBuilder.Uri.AbsoluteUri
$hadPgPassword = Test-Path Env:PGPASSWORD
$previousPgPassword = $env:PGPASSWORD

$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
$manifestPath = "$resolvedBackup.sha256.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "Backup checksum manifest is missing: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$backupInfo = Get-Item -LiteralPath $resolvedBackup
if ([string]$manifest.format -ne 'PostgreSQL custom') {
    throw 'Backup manifest has an unsupported format.'
}
if ([string]$manifest.fileName -ne $backupInfo.Name) {
    throw 'Backup file name does not match its manifest.'
}
if ([long]$manifest.bytes -ne $backupInfo.Length -or $backupInfo.Length -le 0) {
    throw 'Backup size does not match its manifest.'
}
if ([string]$manifest.sha256 -notmatch '^[a-fA-F0-9]{64}$') {
    throw 'Backup manifest contains an invalid SHA256 value.'
}
if ([string]::IsNullOrWhiteSpace([string]$manifest.pgDumpVersion) -or
    [string]$manifest.pgDumpVersion -notmatch '^pg_dump\b') {
    throw 'Backup manifest contains an invalid pg_dump version.'
}
$createdAtUtc = [DateTimeOffset]::MinValue
if (-not [DateTimeOffset]::TryParse([string]$manifest.createdAtUtc, [ref]$createdAtUtc) -or
    $createdAtUtc -gt [DateTimeOffset]::UtcNow.AddMinutes(5)) {
    throw 'Backup manifest contains an invalid creation timestamp.'
}
$actualHash = (Get-FileHash -LiteralPath $resolvedBackup -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne [string]$manifest.sha256) {
    throw 'Backup SHA256 does not match its manifest.'
}

$psql = Get-Command psql -ErrorAction Stop
$pgRestore = Get-Command pg_restore -ErrorAction Stop
$databaseName = 'gymmin_restore_verify_' + [Guid]::NewGuid().ToString('N')
$restoreUriBuilder = [UriBuilder]::new([Uri]$safeAdminConnectionUri)
$restoreUriBuilder.Path = "/$databaseName"
$restoreUri = $restoreUriBuilder.Uri.AbsoluteUri
$databaseCreated = $false

try {
    if ($null -ne $connectionPassword) {
        $env:PGPASSWORD = $connectionPassword
    }

    & $pgRestore.Source --list $resolvedBackup | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Backup archive validation failed with exit code $LASTEXITCODE." }

    & $psql.Source --dbname=$safeAdminConnectionUri --set=ON_ERROR_STOP=1 --command="CREATE DATABASE `"$databaseName`";"
    if ($LASTEXITCODE -ne 0) { throw "Could not create restore verification database (psql exit $LASTEXITCODE)." }
    $databaseCreated = $true

    & $pgRestore.Source --dbname=$restoreUri --exit-on-error --no-owner --no-privileges $resolvedBackup
    if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE." }

    $migrationCount = & $psql.Source --dbname=$restoreUri --set=ON_ERROR_STOP=1 --tuples-only --no-align --command='SELECT COUNT(*) FROM "__EFMigrationsHistory";'
    if ($LASTEXITCODE -ne 0) { throw "Restore verification query failed with exit code $LASTEXITCODE." }
    $parsedMigrationCount = 0
    if (-not [int]::TryParse(([string]$migrationCount).Trim(), [ref]$parsedMigrationCount) -or $parsedMigrationCount -le 0) {
        throw 'Restored database has no EF migration history.'
    }

    Write-Output "Restore verified successfully ($parsedMigrationCount migrations)."
}
finally {
    if ($databaseCreated) {
        & $psql.Source --dbname=$safeAdminConnectionUri --set=ON_ERROR_STOP=1 --command="DROP DATABASE IF EXISTS `"$databaseName`" WITH (FORCE);"
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Could not remove temporary verification database $databaseName."
        }
    }
    if ($hadPgPassword) {
        $env:PGPASSWORD = $previousPgPassword
    } else {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}
