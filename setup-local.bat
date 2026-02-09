@echo off
echo ==========================================
echo Smart Business Accounts - Local Setup Tool
echo ==========================================
echo.

echo 1. Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)
echo [OK] Node.js is installed.
echo.

echo 2. Installing dependencies (this may take a few minutes)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b
)
echo [OK] Dependencies installed.
echo.

echo 3. Checking configuration file...
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo [IMPORTANT] A new .env file has been created.
    echo You MUST edit this file and add your Supabase DATABASE_URL before running the app.
    echo.
) else (
    echo [OK] .env file already exists.
)
echo.

echo 4. Generating Prisma Client...
call npx prisma generate
echo [OK] Prisma Client generated.
echo.

echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo To start the application:
echo 1. Open .env file and paste your Supabase DATABASE_URL
echo 2. Run 'npm run dev' in the terminal
echo.
pause
