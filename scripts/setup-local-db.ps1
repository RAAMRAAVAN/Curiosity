$ErrorActionPreference = 'Stop'

$PGHOST = 'localhost'
$PGPORT = 5432
$PGUSER = 'postgres'
$PGPASSWORD = '#Ram911!'
$APP_DB = 'curiosity_db'
$APP_USER = 'curiosity_user'
$APP_PASS = '#Ram911!'

$env:PGPASSWORD = $PGPASSWORD
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'

if (-not (Test-Path $psql)) {
    throw "psql not found at $psql"
}

$roleExists = & $psql -h $PGHOST -U $PGUSER -p $PGPORT -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$APP_USER';"
if (-not $roleExists) {
    & $psql -h $PGHOST -U $PGUSER -p $PGPORT -d postgres -v ON_ERROR_STOP=1 -c "CREATE USER $APP_USER WITH PASSWORD '$APP_PASS';"
    Write-Host "Created DB user: $APP_USER"
} else {
    Write-Host "DB user already exists: $APP_USER"
}

$dbExists = & $psql -h $PGHOST -U $PGUSER -p $PGPORT -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$APP_DB';"
if (-not $dbExists) {
    & $psql -h $PGHOST -U $PGUSER -p $PGPORT -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $APP_DB OWNER $APP_USER;"
    Write-Host "Created database: $APP_DB"
} else {
    Write-Host "Database already exists: $APP_DB"
}

& $psql -h $PGHOST -U $PGUSER -p $PGPORT -d postgres -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE $APP_DB TO $APP_USER;"

$env:DATABASE_URL = "postgresql://$APP_USER:%23$APP_PASS@$PGHOST:$PGPORT/$APP_DB"
Set-Location $PSScriptRoot\.. 
& npx prisma db push
node "$PSScriptRoot\ensure-default-user.js"

Write-Host "Local DB is ready: postgresql://${APP_USER}:${APP_PASS}@${PGHOST}:${PGPORT}/${APP_DB}"
