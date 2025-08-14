@echo off
echo Starting Education Platform Backend...
echo.

cd backend

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file from example...
    copy .env.example .env
    echo Please edit .env file with your settings if needed
)

echo Starting backend server...
call npm run dev

pause