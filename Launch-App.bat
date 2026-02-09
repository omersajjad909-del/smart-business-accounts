@echo off
setlocal
title Smart Accounts Launcher

echo ===================================================
echo   STARTING SMART BUSINESS ACCOUNTS (DESKTOP MODE)
echo ===================================================
echo.

:: 1. Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it first.
    pause
    exit /b
)

:: 2. Check if .env exists
if not exist .env (
    echo [WARNING] .env file missing. Creating from example...
    copy .env.example .env >nul
    echo [IMPORTANT] Please update .env with your database credentials!
    pause
)

:: 3. Start the Server in a new minimized window
echo Starting Server...
echo (Do not close the 'Next.js Server' window while using the app)
start "Next.js Server" /min cmd /c "npm run dev"

:: 4. Wait for server to be ready (approx 10 seconds)
echo Waiting for system to initialize...
timeout /t 10 /nobreak >nul

:: 5. Open in Desktop App Mode (Chrome/Edge)
echo Launching App Interface...
start chrome --app=http://localhost:3000

:: Option to close
echo.
echo ===================================================
echo   App is running!
echo   Close the 'Next.js Server' window to stop.
echo ===================================================
pause
