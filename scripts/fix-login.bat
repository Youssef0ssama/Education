@echo off
echo Fixing demo user login credentials...
echo.

cd backend

echo Step 1: Testing current database state...
node test-db.js
echo.

echo Step 2: Fixing demo user passwords...
node fix-demo-users.js
echo.

echo Step 3: Testing again...
node test-db.js
echo.

echo ✅ Demo users should now work!
echo.
echo Try logging in with:
echo Email: john.student@education.com
echo Password: password123
echo.
pause