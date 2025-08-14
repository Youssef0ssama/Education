@echo off
echo Setting up local PostgreSQL database...
echo.

echo This script will help you set up PostgreSQL locally.
echo.
echo Prerequisites:
echo 1. PostgreSQL must be installed on your system
echo 2. PostgreSQL service must be running
echo.

echo Checking if PostgreSQL is installed...
psql --version >nul 2>&1
if errorlevel 1 (
    echo ❌ PostgreSQL is not installed or not in PATH
    echo.
    echo Please install PostgreSQL:
    echo 1. Download from: https://www.postgresql.org/download/windows/
    echo 2. Install with default settings
    echo 3. Remember the password you set for 'postgres' user
    echo 4. Add PostgreSQL bin directory to your PATH
    echo.
    pause
    exit /b 1
)

echo ✅ PostgreSQL is installed
echo.

echo Creating database and user...
echo Please enter the PostgreSQL superuser password when prompted.
echo.

REM Create database
psql -U postgres -h localhost -c "CREATE DATABASE education_db;" 2>nul
if errorlevel 1 (
    echo Database might already exist, continuing...
)

REM Run initialization script
echo Initializing database schema...
psql -U postgres -h localhost -d education_db -f "../backend/init.sql"

if errorlevel 1 (
    echo ❌ Failed to initialize database
    echo Please check your PostgreSQL installation and password
    pause
    exit /b 1
)

echo.
echo ✅ Database setup completed!
echo.
echo Database Details:
echo - Host: localhost
echo - Port: 5432
echo - Database: education_db
echo - Username: postgres
echo - Password: [your postgres password]
echo.
echo Next steps:
echo 1. Update backend/.env with your PostgreSQL password
echo 2. Run: cd backend && npm run dev
echo 3. Run: cd frontend && npm run dev
echo.
pause