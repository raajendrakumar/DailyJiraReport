@echo off
setlocal

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%b"

echo Pushing branch "%BRANCH%" to the github remote...
echo (origin/Azure DevOps is currently broken for this repo - github is the working remote)
git push github %BRANCH%
if errorlevel 1 (
    echo.
    echo Push failed. See error above.
    pause
    exit /b 1
)

echo.
echo Push succeeded.
pause
