@echo off
setlocal enabledelayedexpansion

cd /d G:\RAM\Curiosity

echo.
echo ========================================
echo   Curiosity App Launcher
echo ========================================
echo.

rem Read DB_MODE from .env.local if it exists
if exist .env.local (
    for /f "tokens=2 delims==" %%A in ('findstr /i "^DB_MODE=" .env.local') do (
        set "DB_MODE=%%A"
    )
)

if defined DB_MODE (
    echo Using database: !DB_MODE!
) else (
    echo Database mode not set in .env.local
    echo Setting default to: local
    set "DB_MODE=local"
)

echo.
echo Starting Next.js app on port 5000...
echo.
echo To switch databases, edit .env.local and change DB_MODE to:
echo   - local (PostgreSQL on localhost:5432)
echo   - neon (Neon cloud database)
echo.

rem Start the built Next.js app using the normal start script on port 5000
npm start -- --port 5000