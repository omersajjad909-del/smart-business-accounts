@echo off
title Smart Accounts - Update Cloud (GitHub Push)

echo ===================================================
echo   UPDATING CLOUD SERVER (GITHUB PUSH)
echo ===================================================
echo.
echo This script will send your latest changes to GitHub.
echo Vercel will automatically detect these changes and update your site.
echo.

:: 1. Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed. Please install Git first.
    pause
    exit /b
)

:: 2. Add all changes
echo Adding files...
git add .

:: 3. Commit changes
echo Committing changes...
set /p commit_msg="Enter a message for this update (e.g., Fixed bugs): "
if "%commit_msg%"=="" set commit_msg="Update from Desktop App"
git commit -m "%commit_msg%"

:: 4. Push to GitHub
echo Pushing to GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo [RETRY] Pushing to 'master' branch instead...
    git push origin master
)

echo.
echo ===================================================
echo   Update Sent Successfully!
echo   Vercel will update your site in 2-3 minutes.
echo ===================================================
pause
