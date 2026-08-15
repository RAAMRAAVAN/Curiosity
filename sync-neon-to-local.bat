@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
cd /d "%ROOT%"

set "PG_BIN=C:\Program Files\PostgreSQL\18\bin"
set "PG_DUMP=%PG_BIN%\pg_dump.exe"
set "PG_RESTORE=%PG_BIN%\pg_restore.exe"
set "PSQL=%PG_BIN%\psql.exe"

set "NEON_URL=postgresql://neondb_owner:npg_x0NJKRZC6GOi@ep-misty-block-aod3sxja.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
set "LOCAL_HOST=localhost"
set "LOCAL_PORT=5432"
set "LOCAL_DB=curiosity_db"
set "LOCAL_USER=curiosity_user"
set "LOCAL_PASS=#Ram911!"
set "DUMP_FILE=%ROOT%neon_full_dump.dump"

if not exist "%PG_DUMP%" (
    echo ERROR: pg_dump not found at %PG_DUMP%
    exit /b 1
)

if not exist "%PG_RESTORE%" (
    echo ERROR: pg_restore not found at %PG_RESTORE%
    exit /b 1
)

if not exist "%PSQL%" (
    echo ERROR: psql not found at %PSQL%
    exit /b 1
)

echo.
echo ================================
echo Neon -> Local DB Sync
echo ================================
echo.
echo Exporting Neon database to dump file...
"%PG_DUMP%" --dbname="%NEON_URL%" --format=custom --no-owner --no-privileges --file="%DUMP_FILE%"

if errorlevel 1 (
    echo ERROR: Neon dump failed.
    exit /b 1
)

if not exist "%DUMP_FILE%" (
    echo ERROR: Dump file was not created: %DUMP_FILE%
    exit /b 1
)

echo.
echo Restoring dump into local PostgreSQL database...
set "PGPASSWORD=%LOCAL_PASS%"
"%PG_RESTORE%" -h "%LOCAL_HOST%" -U "%LOCAL_USER%" -p "%LOCAL_PORT%" -d "%LOCAL_DB%" --clean --if-exists --no-owner --no-privileges --verbose "%DUMP_FILE%"

if errorlevel 1 (
    echo ERROR: Local restore failed.
    exit /b 1
)

echo.
echo Sync complete.
echo Neon data copied to local database:
for %%I in ("%LOCAL_DB%") do echo   %%~I

echo Dump file:
for %%I in ("%DUMP_FILE%") do echo   %%~I

echo.
echo To use local DB, set:
echo   DB_MODE=local

echo.

pause
