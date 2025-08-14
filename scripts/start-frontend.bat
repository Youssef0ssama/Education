@echo off
echo Starting Education Platform Frontend...
echo.

cd frontend

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

echo Starting frontend server...
call npm run dev

pause