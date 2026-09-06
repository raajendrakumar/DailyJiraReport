@echo off
setlocal
set "SCRIPT_DIR=%~dp0"

node "%SCRIPT_DIR%send-report.js" %*
if errorlevel 1 (
    echo.
    echo Failed to send the report. See error above.
    pause
    exit /b 1
)

pause
