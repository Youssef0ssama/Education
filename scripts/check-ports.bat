@echo off
echo Checking which processes are using ports 3000, 5000, and 5432...
echo.

echo Port 3000 (Frontend):
netstat -ano | findstr :3000
echo.

echo Port 5000 (Backend):
netstat -ano | findstr :5000
echo.

echo Port 5432 (Database):
netstat -ano | findstr :5432
echo.

echo To kill a process, use: taskkill /PID [PID_NUMBER] /F
echo.
pause