@echo off
REM =========================================================================
REM PostgreSQL Local Database Setup Script for Curiosity
REM =========================================================================
REM This script sets up the local PostgreSQL database on any system
REM Prerequisites: PostgreSQL 18 must be installed at C:\Program Files\PostgreSQL\18
REM =========================================================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo PostgreSQL Local Database Setup
echo ========================================
echo.

REM Configuration
set PG_PATH=C:\Program Files\PostgreSQL\18\bin
set PG_HOST=127.0.0.1
set PG_PORT=5432
set PG_USER=postgres
set DB_USER=curiosity_user
set DB_PASSWORD=#Ram911!
set DB_NAME=curiosity_db
set BACKUP_FILE=%~dp0local_before_neon_backup.dump

REM Verify PostgreSQL is installed
if not exist "%PG_PATH%\psql.exe" (
    echo ERROR: PostgreSQL 18 not found at %PG_PATH%
    echo Please install PostgreSQL 18 first.
    pause
    exit /b 1
)

echo [1/5] Checking PostgreSQL service...
sc query postgresql-x64-18 | find "RUNNING" >nul
if errorlevel 1 (
    echo WARNING: PostgreSQL service is not running
    echo Starting PostgreSQL service...
    net start postgresql-x64-18 >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Could not start PostgreSQL service
        pause
        exit /b 1
    )
    timeout /t 2 /nobreak >nul
    echo PostgreSQL service started.
) else (
    echo PostgreSQL service is running.
)

echo.
echo [2/5] Creating PostgreSQL user '%DB_USER%'...
REM We'll use a temporary trust mode to create the user
REM First, check if user exists
"%PG_PATH%\psql.exe" -h %PG_HOST% -U postgres -d postgres -c "SELECT 1" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Could not connect to PostgreSQL as postgres user
    echo Make sure PostgreSQL is running and you have access
    pause
    exit /b 1
)

"%PG_PATH%\psql.exe" -h %PG_HOST% -U postgres -d postgres -c "DROP USER IF EXISTS %DB_USER%;" >nul 2>&1
"%PG_PATH%\psql.exe" -h %PG_HOST% -U postgres -d postgres -c "CREATE USER %DB_USER% WITH PASSWORD '%DB_PASSWORD%';" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to create database user
    pause
    exit /b 1
)
echo User '%DB_USER%' created successfully.

echo.
echo [3/5] Creating database '%DB_NAME%'...
"%PG_PATH%\psql.exe" -h %PG_HOST% -U postgres -d postgres -c "CREATE DATABASE %DB_NAME% OWNER %DB_USER%;" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to create database
    pause
    exit /b 1
)
echo Database '%DB_NAME%' created successfully.

echo.
echo [4/5] Restoring database from backup...
if not exist "%BACKUP_FILE%" (
    echo WARNING: Backup file not found at %BACKUP_FILE%
    echo Skipping restore. You can manually restore later if needed.
) else (
    set PGPASSWORD=%DB_PASSWORD%
    "%PG_PATH%\pg_restore.exe" -h %PG_HOST% -U %DB_USER% -d %DB_NAME% -p %PG_PORT% "%BACKUP_FILE%" >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Failed to restore database
        pause
        exit /b 1
    )
    echo Database restored successfully.
)

echo.
echo [5/5] Testing connection...
set PGPASSWORD=%DB_PASSWORD%
"%PG_PATH%\psql.exe" -h %PG_HOST% -U %DB_USER% -d %DB_NAME% -p %PG_PORT% -c "SELECT 1 as connection_test;" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Connection test failed
    pause
    exit /b 1
)
echo Connection test successful!

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Database Connection Details:
echo   Host: %PG_HOST%
echo   Port: %PG_PORT%
echo   User: %DB_USER%
echo   Password: %DB_PASSWORD%
echo   Database: %DB_NAME%
echo.
echo Environment variable to use:
echo   LOCAL_DATABASE_URL=postgresql://%DB_USER%:%%23Ram911!@%PG_HOST%:%PG_PORT%/%DB_NAME%
echo.
echo To run the app:
echo   set DB_MODE=local
echo   set LOCAL_DATABASE_URL=postgresql://%DB_USER%:%%23Ram911!@%PG_HOST%:%PG_PORT%/%DB_NAME%
echo   npm run dev
echo.
pause
