[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ConnectionUri,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not [Uri]::TryCreate($ConnectionUri, [UriKind]::Absolute, [ref]$null) -or
    (-not $ConnectionUri.StartsWith('postgresql://', [System.StringComparison]::OrdinalIgnoreCase) -and
     -not $ConnectionUri.StartsWith('postgres://', [System.StringComparison]::OrdinalIgnoreCase))) {
    throw 'ConnectionUri must be a PostgreSQL URI (postgresql://...).'
}

$connectionBuilder = [UriBuilder]::new([Uri]$ConnectionUri)
$connectionPassword = if ([string]::IsNullOrEmpty($connectionBuilder.Password)) {
    $null
} else {
    [Uri]::UnescapeDataString($connectionBuilder.Password)
}
$connectionBuilder.Password = ''
$safeConnectionUri = $connectionBuilder.Uri.AbsoluteUri
$hadPgPassword = Test-Path Env:PGPASSWORD
$previousPgPassword = $env:PGPASSWORD

$pgDump = Get-Command pg_dump -ErrorAction Stop
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

$timestamp = [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$finalPath = Join-Path $resolvedOutput "gymmin-$timestamp.dump"
$temporaryPath = "$finalPath.partial"

try {
    if ($null -ne $connectionPassword) {
        $env:PGPASSWORD = $connectionPassword
    }

    & $pgDump.Source --dbname=$safeConnectionUri --format=custom --compress=9 --no-owner --no-privileges --file=$temporaryPath
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE."
    }

    $backup = Get-Item -LiteralPath $temporaryPath
    if ($backup.Length -le 0) {
        throw 'pg_dump produced an empty backup.'
    }

    Move-Item -LiteralPath $temporaryPath -Destination $finalPath
    $hash = Get-FileHash -LiteralPath $finalPath -Algorithm SHA256
    $manifest = [ordered]@{
        format = 'PostgreSQL custom'
        createdAtUtc = [DateTimeOffset]::UtcNow.ToString('O')
        fileName = [System.IO.Path]::GetFileName($finalPath)
        bytes = (Get-Item -LiteralPath $finalPath).Length
        sha256 = $hash.Hash.ToLowerInvariant()
        pgDumpVersion = (& $pgDump.Source --version | Select-Object -First 1)
    }
    $manifest | ConvertTo-Json | Set-Content -LiteralPath "$finalPath.sha256.json" -Encoding utf8

    Write-Output $finalPath
}
finally {
    if (Test-Path -LiteralPath $temporaryPath) {
        Remove-Item -LiteralPath $temporaryPath -Force
    }
    if ($hadPgPassword) {
        $env:PGPASSWORD = $previousPgPassword
    } else {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}
