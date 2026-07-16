[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ConnectionUri,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $ConnectionUri.StartsWith('postgresql://', [System.StringComparison]::OrdinalIgnoreCase) -and
    -not $ConnectionUri.StartsWith('postgres://', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'ConnectionUri must be a PostgreSQL URI (postgresql://...).'
}

$pgDump = Get-Command pg_dump -ErrorAction Stop
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

$timestamp = [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$finalPath = Join-Path $resolvedOutput "gymmin-$timestamp.dump"
$temporaryPath = "$finalPath.partial"

try {
    & $pgDump.Source --dbname=$ConnectionUri --format=custom --compress=9 --no-owner --no-privileges --file=$temporaryPath
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
    }
    $manifest | ConvertTo-Json | Set-Content -LiteralPath "$finalPath.sha256.json" -Encoding utf8

    Write-Output $finalPath
}
finally {
    if (Test-Path -LiteralPath $temporaryPath) {
        Remove-Item -LiteralPath $temporaryPath -Force
    }
}
