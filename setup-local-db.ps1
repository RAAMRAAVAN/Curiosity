# =========================================================================
# PostgreSQL Local Database Setup Script for Curiosity (PowerShell)
# =========================================================================
# This script sets up the local PostgreSQL database on any system
# Prerequisites: PostgreSQL 18 must be installed at C:\Program Files\PostgreSQL\18
# 
# Usage:
#   powershell -ExecutionPolicy Bypass -File setup-local-db.ps1
# =========================================================================

param(
    [string]$PostgreSQLPath = "C:\Program Files\PostgreSQL\18\bin",
    [string]$Host = "127.0.0.1",
    [string]$Port = "5432",
    [string]$AdminUser = "postgres",
    [string]$DbUser = "curiosity_user",
    [string]$DbPassword = "#Ram911!",
    [string]$DbName = "curiosity_db"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================"
Write-Host "PostgreSQL Local Database Setup"
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Get backup file path from script directory
$backupFile = Join-Path (Split-Path $MyInvocation.MyCommand.Path) "local_before_neon_backup.dump"

# Step 1: Verify PostgreSQL is installed
Write-Host "[1/5] Verifying PostgreSQL installation..." -ForegroundColor Cyan
if (-not (Test-Path "$PostgreSQLPath\psql.exe")) {
    Write-Host "ERROR: PostgreSQL 18 not found at $PostgreSQLPath" -ForegroundColor Red
    exit 1
}
Write-Host "PostgreSQL found at: $PostgreSQLPath" -ForegroundColor Green

# Step 2: Check PostgreSQL service
Write-Host ""
Write-Host "[2/5] Checking PostgreSQL service..." -ForegroundColor Cyan
$service = Get-Service postgresql-x64-18 -ErrorAction SilentlyContinue
if ($null -eq $service) {
    Write-Host "WARNING: PostgreSQL service not found" -ForegroundColor Yellow
} elseif ($service.Status -ne "Running") {
    Write-Host "Starting PostgreSQL service..." -ForegroundColor Yellow
    Start-Service postgresql-x64-18
    Start-Sleep -Seconds 2
    Write-Host "PostgreSQL service started." -ForegroundColor Green
} else {
    Write-Host "PostgreSQL service is running." -ForegroundColor Green
}

# Step 3: Create PostgreSQL user
Write-Host ""
Write-Host "[3/5] Creating PostgreSQL user '$DbUser'..." -ForegroundColor Cyan

# Test connection first
try {
    $env:PGPASSWORD = ""
    & "$PostgreSQLPath\psql.exe" -h $Host -U $AdminUser -d postgres -c "SELECT 1" 2>&1 | Out-Null
} catch {
    Write-Host "ERROR: Could not connect to PostgreSQL" -ForegroundColor Red
    exit 1
}

# Drop user if exists and create new one
& "$PostgreSQLPath\psql.exe" -h $Host -U $AdminUser -d postgres -c "DROP USER IF EXISTS `"$DbUser`";" 2>&1 | Out-Null
& "$PostgreSQLPath\psql.exe" -h $Host -U $AdminUser -d postgres -c "CREATE USER `"$DbUser`" WITH PASSWORD '$DbPassword';" 2>&1 | Out-Null
Write-Host "User '$DbUser' created successfully." -ForegroundColor Green

# Step 4: Create database
Write-Host ""
Write-Host "[4/5] Creating database '$DbName'..." -ForegroundColor Cyan
& "$PostgreSQLPath\psql.exe" -h $Host -U $AdminUser -d postgres -c "CREATE DATABASE `"$DbName`" OWNER `"$DbUser`";" 2>&1 | Out-Null
Write-Host "Database '$DbName' created successfully." -ForegroundColor Green

# Step 5: Restore from backup
Write-Host ""
Write-Host "[5/5] Restoring database from backup..." -ForegroundColor Cyan
if (-not (Test-Path $backupFile)) {
    Write-Host "WARNING: Backup file not found at $backupFile" -ForegroundColor Yellow
    Write-Host "Skipping restore. You can manually restore later if needed." -ForegroundColor Yellow
} else {
    $env:PGPASSWORD = $DbPassword
    & "$PostgreSQLPath\pg_restore.exe" -h $Host -U $DbUser -d $DbName -p $Port "$backupFile" 2>&1 | Out-Null
    Write-Host "Database restored successfully." -ForegroundColor Green
}

# Test connection
Write-Host ""
Write-Host "Testing connection..." -ForegroundColor Cyan
$env:PGPASSWORD = $DbPassword
& "$PostgreSQLPath\psql.exe" -h $Host -U $DbUser -d $DbName -p $Port -c "SELECT 1 as connection_test;" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Connection test successful!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Connection test failed" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host ""
Write-Host "========================================"
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database Connection Details:" -ForegroundColor Cyan
Write-Host "  Host: $Host"
Write-Host "  Port: $Port"
Write-Host "  User: $DbUser"
Write-Host "  Password: $DbPassword"
Write-Host "  Database: $DbName"
Write-Host ""
Write-Host "To use in your app, set these environment variables:" -ForegroundColor Yellow
Write-Host '  $env:DB_MODE = "local"'
Write-Host "  `$env:LOCAL_DATABASE_URL = 'postgresql://$DbUser:%23Ram911!@$Host:$Port/$DbName'"
Write-Host ""
Write-Host "Or add to .env.local file:" -ForegroundColor Yellow
Write-Host "  DB_MODE=local"
Write-Host "  LOCAL_DATABASE_URL=postgresql://$DbUser:%23Ram911!@$Host:$Port/$DbName"
Write-Host ""
Write-Host "Then run: npm run dev" -ForegroundColor Green
Write-Host ""
