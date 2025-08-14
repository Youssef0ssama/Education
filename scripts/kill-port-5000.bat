@echo off
echo Killing processes on port 5000...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo Killing process %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo Port 5000 should now be free. Try starting the backend again.
pause