$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$testRoot = Join-Path $projectRoot '.test-db'
$dataDirectory = Join-Path $testRoot 'data'
$envFile = Join-Path $projectRoot '.env.test.local'
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
$initdb = Join-Path $pgBin 'initdb.exe'
$pgCtl = Join-Path $pgBin 'pg_ctl.exe'
$psql = Join-Path $pgBin 'psql.exe'
$port = 55433

foreach ($tool in @($initdb, $pgCtl, $psql)) {
    if (-not (Test-Path $tool)) {
        throw "Required PostgreSQL tool is missing: $tool"
    }
}
if ((Test-Path $dataDirectory) -or (Test-Path $envFile)) {
    throw 'Test environment files already exist. Refusing to overwrite the database or credentials.'
}

New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
$adminPasswordFile = Join-Path $testRoot 'bootstrap-password.tmp'
$bootstrapSqlFile = Join-Path $testRoot 'bootstrap.sql.tmp'
$adminPassword = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$appPassword = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$seedPassword = [Guid]::NewGuid().ToString('N')
$jwtSecret = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($adminPasswordFile, "$adminPassword`n", $utf8NoBom)

try {
    & $initdb -D $dataDirectory -U curiosity_test_admin --auth-local=trust --auth-host=scram-sha-256 "--pwfile=$adminPasswordFile" --encoding=UTF8
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL test cluster initialization failed.' }

    $env:PGPASSWORD = $adminPassword
    & $pgCtl -D $dataDirectory -l (Join-Path $testRoot 'postgres.log') -o "-h 127.0.0.1 -p $port" -w start
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL test cluster did not start.' }

    $bootstrapSql = @"
CREATE ROLE curiosity_test_user WITH LOGIN PASSWORD '$appPassword' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE DATABASE curiosity_loadtest OWNER curiosity_test_user;
"@
    [System.IO.File]::WriteAllText($bootstrapSqlFile, $bootstrapSql, $utf8NoBom)
    & $psql -w -h 127.0.0.1 -p $port -U curiosity_test_admin -d postgres -v ON_ERROR_STOP=1 -f $bootstrapSqlFile
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the isolated test database and role.' }

    $databaseUrl = "postgresql://curiosity_test_user:$appPassword@127.0.0.1:$port/curiosity_loadtest"
    $environment = @"
DATABASE_URL=$databaseUrl
JWT_SECRET=$jwtSecret
LOAD_TEST_SEED_PASSWORD=$seedPassword
LOAD_TEST_EMAIL=load.admin@curiosity.test
LOAD_TEST_PASSWORD=$seedPassword
LOAD_TEST_BASE_URL=http://127.0.0.1:3100
LOAD_TEST_ATTENDANCE_DAYS=7
"@
    [System.IO.File]::WriteAllText($envFile, $environment, $utf8NoBom)

    Push-Location $projectRoot
    try {
        & npm.cmd run test:db:push
        if ($LASTEXITCODE -ne 0) { throw 'Prisma could not create the test database schema.' }
    } finally {
        Pop-Location
    }

    Write-Output 'Isolated test database created and schema applied.'
    Write-Output "Database: 127.0.0.1:$port/curiosity_loadtest"
    Write-Output 'No production or live-site records were copied.'
    Write-Output 'Run npm run test:db:seed to populate synthetic load-test data.'
    Write-Output 'Run npm run test:build, then npm run test:start to launch the production build on port 3100.'
    Write-Output 'Start/stop PostgreSQL later with scripts/start-test-database.ps1 and scripts/stop-test-database.ps1.'
} finally {
    Remove-Item $adminPasswordFile, $bootstrapSqlFile -Force -ErrorAction SilentlyContinue
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
