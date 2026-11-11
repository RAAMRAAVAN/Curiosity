@echo off
setlocal

cd /d "%~dp0"

if not exist "%~dp0backup-db-to-onedrive.ps1" (
    echo ERROR: Backup script not found: "%~dp0backup-db-to-onedrive.ps1"
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup-db-to-onedrive.ps1"
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
    echo.
    echo Backup process stopped with an error.
    pause
)
exit /b %RESULT%
