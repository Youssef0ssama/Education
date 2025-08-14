@echo off
echo Fixing port 5000 conflict...
echo.

echo Option 1: Kill processes using port 5000
echo ==========================================
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo Found process %%a using port 5000
    taskkill /PID %%a /F 2>nul
    if errorlevel 0 (
        echo ✅ Killed process %%a
    ) else (
        echo ❌ Failed to kill process %%a
    )
)

echo.
echo Option 2: Use different port
echo ============================
echo Creating .env file with PORT=5001...

cd backend
if not exist ".env" (
    copy .env.example .env
)

REM Update or add PORT=5001 to .env
echo PORT=5001 >> .env

echo ✅ Backend will now use port 5001
echo.
echo Next steps:
echo 1. Try starting backend: npm run dev
echo 2. Update frontend proxy in vite.config.js to use port 5001
echo.
pause