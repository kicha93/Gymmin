[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$AdminConnectionUri,

    [Parameter(Mandatory = $true)]
    [string]$BackupPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $AdminConnectionUri.StartsWith('postgresql://', [System.StringComparison]::OrdinalIgnoreCase) -and
    -not $AdminConnectionUri.StartsWith('postgres://', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'AdminConnectionUri must be a PostgreSQL URI (postgresql://...).'
}

$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
$manifestPath = "$resolvedBackup.sha256.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "Backup checksum manifest is missing: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$actualHash = (Get-FileHash -LiteralPath $resolvedBackup -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne [string]$manifest.sha256) {
    throw 'Backup SHA256 does not match its manifest.'
}

$psql = Get-Command psql -ErrorAction Stop
$pgRestore = Get-Command pg_restore -ErrorAction Stop
$databaseName = 'gymmin_restore_verify_' + [Guid]::NewGuid().ToString('N')
$adminUri = [Uri]$AdminConnectionUri
$restoreUriBuilder = [UriBuilder]::new($adminUri)
$restoreUriBuilder.Path = "/$databaseName"
$restoreUri = $restoreUriBuilder.Uri.AbsoluteUri
$databaseCreated = $false

try {
    & $psql.Source --dbname=$AdminConnectionUri --set=ON_ERROR_STOP=1 --command="CREATE DATABASE `"$databaseName`";"
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
        & $psql.Source --dbname=$AdminConnectionUri --set=ON_ERROR_STOP=1 --command="DROP DATABASE IF EXISTS `"$databaseName`" WITH (FORCE);"
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Could not remove temporary verification database $databaseName."
        }
    }
}
