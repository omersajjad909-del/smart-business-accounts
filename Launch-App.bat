@echo off
setlocal
title Smart Accounts Launcher

echo ===================================================
echo   STARTING SMART BUSINESS ACCOUNTS (APP MODE)
echo ===================================================
echo.

:: 1. Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it first.
    pause
    exit /b
)

:: 2. Check for Production Build
if not exist ".next\BUILD_ID" (
    echo [INFO] First time setup: Building the application...
    echo This may take a few minutes. Please wait...
    call npm run vercel-build
    echo Build complete!
)

:: 3. Start the Server (Production Mode)
echo Starting Server...
start "Smart Accounts Server" /min cmd /c "npm start"

:: 4. Wait for server to be ready (approx 5 seconds)
timeout /t 5 /nobreak >nul

:: 5. Open in Desktop App Mode
:: This tries to open the installed PWA if registered, otherwise opens in App mode
start chrome --app=http://localhost:3000

exit
