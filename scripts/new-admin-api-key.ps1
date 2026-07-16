[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9._-]{1,100}$')]
    [string]$KeyId
)

$ErrorActionPreference = 'Stop'
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$apiKey = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$sha = [System.Security.Cryptography.SHA256]::Create()
try { $hash = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($apiKey)) } finally { $sha.Dispose() }
$hashHex = ([BitConverter]::ToString($hash)).Replace('-', '').ToLowerInvariant()

[pscustomobject]@{
    KeyId = $KeyId
    ApiKey = $apiKey
    ApiKeySha256 = $hashHex
}
