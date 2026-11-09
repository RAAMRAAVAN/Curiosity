$ErrorActionPreference = 'Stop'
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$testRoot = Join-Path $projectRoot '.test-db'
$dataDirectory = Join-Path $testRoot 'data'
$pgCtl = 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe'

if (-not (Test-Path $dataDirectory)) {
    throw 'Test database is not initialized. Run scripts/setup-test-environment.ps1 first.'
}
if (-not (Test-Path $pgCtl)) {
    throw "PostgreSQL control tool is missing: $pgCtl"
}

& $pgCtl -D $dataDirectory status
if ($LASTEXITCODE -eq 0) {
    Write-Output 'Isolated test PostgreSQL is already running.'
    exit 0
}

& $pgCtl -D $dataDirectory -l (Join-Path $testRoot 'postgres.log') -o '-h 127.0.0.1 -p 55433' -w start
if ($LASTEXITCODE -ne 0) {
    throw 'Could not start isolated test PostgreSQL.'
}
Write-Output 'Isolated test PostgreSQL is running on 127.0.0.1:55433.'
