@echo off
echo Testing Education Platform Installation...
echo.

REM Test backend dependencies
echo Testing backend dependencies...
cd backend
call npm list --depth=0
if errorlevel 1 (
    echo Backend dependencies have issues
    cd ..
    goto :frontend_test
) else (
    echo Backend dependencies OK
)
cd ..

:frontend_test
REM Test frontend dependencies
echo Testing frontend dependencies...
cd frontend
call npm list --depth=0
if errorlevel 1 (
    echo Frontend dependencies have issues
    cd ..
    goto :end
) else (
    echo Frontend dependencies OK
)
cd ..

echo.
echo Installation test completed!
echo You can now run 'scripts\dev.bat' to start the platform.

:end
pause