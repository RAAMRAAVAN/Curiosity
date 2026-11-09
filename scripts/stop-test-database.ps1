$ErrorActionPreference = 'Stop'
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$dataDirectory = Join-Path $projectRoot '.test-db\data'
$pgCtl = 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe'

if (-not (Test-Path $dataDirectory)) {
    Write-Output 'Isolated test PostgreSQL is not initialized.'
    exit 0
}
if (-not (Test-Path $pgCtl)) {
    throw "PostgreSQL control tool is missing: $pgCtl"
}

& $pgCtl -D $dataDirectory -m fast -w stop
if ($LASTEXITCODE -ne 0) {
    throw 'Could not stop isolated test PostgreSQL.'
}
Write-Output 'Isolated test PostgreSQL stopped.'
