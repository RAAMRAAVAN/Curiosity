@echo off
setlocal

set "PROJECT_ROOT=%~dp0"
pushd "%PROJECT_ROOT%" || exit /b 1

echo.
echo ============================================
echo   Curiosity Isolated Load Test
echo ============================================
echo.
echo This starts the isolated test database and app.
echo It does not change the live app or its tunnel route.
echo The app listens only on 127.0.0.1:3100.
echo Load requests can use localhost or the approved Cloudflare hostname.
echo.

if not exist ".env.test.local" (
    echo ERROR: Test environment is not initialized.
    echo Run scripts\setup-test-environment.ps1 first.
    popd
    pause
    exit /b 1
)

if not exist ".next-test\BUILD_ID" (
    echo ERROR: Isolated production build is missing.
    echo Run: npm run test:build
    popd
    pause
    exit /b 1
)

echo.
echo Select how load-test requests should reach the isolated app:
echo   1. Direct local route (no Cloudflare)
echo   2. Through Cloudflare test hostname
choice /C 12 /N /M "Select 1 or 2: "
if errorlevel 2 goto cloudflare_target
set "LOAD_TEST_BASE_URL=http://127.0.0.1:3100"
goto target_selected

:cloudflare_target
echo.
echo Confirm Cloudflare Access protects loadtest.hansuttamxikhya.in
echo and its Service Auth policy accepts a service token.
choice /C YN /N /M "Is that Access policy configured? (Y/N): "
if errorlevel 2 (
    echo No test will be started. Configure Cloudflare Access first.
    popd
    pause
    exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$content = Get-Content '.env.test.local' -Raw; if ($content -match '(?m)^CF_ACCESS_CLIENT_ID=.+$' -and $content -match '(?m)^CF_ACCESS_CLIENT_SECRET=.+$') { exit 0 } else { exit 1 }" >nul
if errorlevel 1 goto configure_access_token
goto cloudflare_token_ready

:configure_access_token
echo.
echo No local Cloudflare Access service token was found.
echo The values will be entered securely and saved in ignored .env.test.local.
choice /C YN /N /M "Configure the service token now? (Y/N): "
if errorlevel 2 (
    echo No test will be started without a service token.
    popd
    pause
    exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%scripts\configure-test-access.ps1"
if errorlevel 1 (
    echo ERROR: Could not configure the Cloudflare Access service token.
    popd
    pause
    exit /b 1
)

:cloudflare_token_ready
set "LOAD_TEST_BASE_URL=https://loadtest.hansuttamxikhya.in"

:target_selected

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%scripts\check-test-port.ps1"
if errorlevel 1 (
    echo ERROR: Cannot start the test app while port 3100 is occupied.
    echo The process using it might not be the test app. Identify it before stopping anything.
    popd
    pause
    exit /b 1
)

echo Starting isolated PostgreSQL...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%scripts\start-test-database.ps1"
if errorlevel 1 (
    echo ERROR: Could not start isolated PostgreSQL.
    popd
    pause
    exit /b 1
)

echo Starting isolated app on 127.0.0.1:3100...
start "Curiosity Isolated Test App" /D "%PROJECT_ROOT%" cmd.exe /k npm.cmd run test:start

echo Waiting for isolated app health check...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ready = $false; for ($i = 0; $i -lt 45; $i++) { try { $response = Invoke-RestMethod -Uri 'http://127.0.0.1:3100/api/health/db/' -TimeoutSec 3; if ($response.success) { $ready = $true; break } } catch { Start-Sleep -Seconds 2 } }; if ($ready) { Write-Output 'Isolated app and database are ready.'; exit 0 }; Write-Error 'Test app did not become ready. Check the app window.'; exit 1"
if errorlevel 1 (
    echo.
    echo The test app did not pass its health check.
    echo Review the "Curiosity Isolated Test App" window.
    popd
    pause
    exit /b 1
)

echo.
echo Choose a synthetic workload:
echo   1. Start environment only
echo   2. Read-only test - 202 users, 60 seconds
echo   3. Read/write test - 202 synthetic users
echo.
choice /C 123 /N /M "Select 1, 2, or 3: "
if errorlevel 3 goto write_test
if errorlevel 2 goto read_test
goto ready

:read_test
echo.
echo WARNING: Load uses this PC's resources and may slow the live app.
choice /C YN /N /M "Run 202-user read-only test? (Y/N): "
if errorlevel 2 goto ready
set "LOAD_TEST_CONCURRENCY=202"
set "LOAD_TEST_DURATION_SECONDS=60"
call npm.cmd run test:load:readonly
goto finished

:write_test
echo.
echo WARNING: This writes attendance only in the isolated synthetic test database.
echo Load uses this PC's resources and may slow the live app.
choice /C YN /N /M "Run 202-user read/write test? (Y/N): "
if errorlevel 2 goto ready
set "HEAVY_LOAD_USERS=202"
call npm.cmd run test:load:write
goto finished

:ready
echo.
echo Test environment is running at http://127.0.0.1:3100
if "%LOAD_TEST_BASE_URL%"=="https://loadtest.hansuttamxikhya.in" echo Load tests will target https://loadtest.hansuttamxikhya.in
echo Keep the "Curiosity Isolated Test App" window open while testing.
echo Close that app window with Ctrl+C, then run scripts\stop-test-database.ps1.
goto end

:finished
echo.
echo Test run finished. The isolated app and database are still running.
echo Requests were directed to %LOAD_TEST_BASE_URL%.
echo Close the "Curiosity Isolated Test App" window with Ctrl+C, then run:
echo   scripts\stop-test-database.ps1

:end
popd
pause
exit /b
