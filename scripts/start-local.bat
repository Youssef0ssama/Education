@echo off
echo Starting Education Platform (Local Development)...
echo.

REM Check if PostgreSQL is running
echo Checking PostgreSQL connection...
psql -U postgres -h localhost -d education_db -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo ❌ Cannot connect to PostgreSQL database
    echo.
    echo Please ensure:
    echo 1. PostgreSQL is installed and running
    echo 2. Database 'education_db' exists
    echo 3. Your .env file has correct database credentials
    echo.
    echo Run 'scripts\setup-local-db.bat' to set up the database
    pause
    exit /b 1
)

echo ✅ Database connection successful
echo.

echo Starting backend and frontend...
echo.
echo This will open two command windows:
echo 1. Backend server (http://localhost:5000)
echo 2. Frontend server (http://localhost:3000)
echo.

REM Start backend in new window
start "Education Platform - Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "Education Platform - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Both servers are starting...
echo.
echo Access the application at: http://localhost:3000
echo.
echo Demo accounts:
echo - Student: john.student@education.com / password123
echo - Teacher: jane.teacher@education.com / password123
echo - Parent: mary.parent@education.com / password123
echo - Admin: admin@education.com / password123
echo.
pause