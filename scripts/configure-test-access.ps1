$ErrorActionPreference = 'Stop'
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$envFile = Join-Path $projectRoot '.env.test.local'

if (-not (Test-Path $envFile)) {
    throw 'Test environment is not initialized. Run scripts/setup-test-environment.ps1 first.'
}

function Read-SecretValue([string]$Prompt) {
    $secureValue = Read-Host -Prompt $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $secureValue.Dispose()
    }
}

$clientId = Read-SecretValue 'Cloudflare Access service-token Client ID'
$clientSecret = Read-SecretValue 'Cloudflare Access service-token Client Secret'
if (-not $clientId -or -not $clientSecret) {
    throw 'Both Cloudflare Access service-token values are required.'
}

$lines = @(Get-Content $envFile | Where-Object {
    $_ -notmatch '^(CF_ACCESS_CLIENT_ID|CF_ACCESS_CLIENT_SECRET)='
})
$lines += "CF_ACCESS_CLIENT_ID=$clientId"
$lines += "CF_ACCESS_CLIENT_SECRET=$clientSecret"
[System.IO.File]::WriteAllLines($envFile, $lines, [System.Text.Encoding]::ASCII)

$clientId = $null
$clientSecret = $null
Write-Output 'Cloudflare Access service-token values saved to the ignored local test environment file.'
