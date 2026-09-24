@echo off
setlocal

cd /d "%~dp0"

rem Run the attendance finalization once at the scheduled time.
rem This is intended to be triggered by Windows Task Scheduler at 11:55 PM.
node "scripts\finalize-attendance.mjs"

if errorlevel 1 (
  echo Attendance finalization failed.
  exit /b 1
)

exit /b 0
