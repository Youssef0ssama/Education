@echo off
echo Installing Education Platform (Local Development)...
echo.

echo Step 1: Installing backend dependencies...
cd backend
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed
cd ..

echo.
echo Step 2: Installing frontend dependencies...
cd frontend
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed
cd ..

echo.
echo Step 3: Setting up environment...
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo ✅ Created backend/.env file
) else (
    echo ✅ Backend .env file already exists
)

echo.
echo ✅ Installation completed!
echo.
echo Next steps:
echo 1. Install PostgreSQL if not already installed
echo 2. Run: scripts\setup-local-db.bat
echo 3. Update backend\.env with your PostgreSQL password
echo 4. Run: scripts\start-local.bat
echo.
pause