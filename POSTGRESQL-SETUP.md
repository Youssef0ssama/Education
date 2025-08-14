# PostgreSQL Setup Guide

## Windows Installation

### 1. Download PostgreSQL
- Go to: https://www.postgresql.org/download/windows/
- Download the installer for your Windows version
- Choose PostgreSQL 15 or later

### 2. Install PostgreSQL
1. Run the installer as Administrator
2. Choose installation directory (default is fine)
3. Select components:
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4
   - ✅ Stack Builder
   - ✅ Command Line Tools
4. Set data directory (default is fine)
5. **Set password for 'postgres' user** (remember this!)
6. Set port: 5432 (default)
7. Set locale (default is fine)
8. Complete installation

### 3. Verify Installation
Open Command Prompt and run:
```cmd
psql --version
```

If you get "command not found", add PostgreSQL to your PATH:
1. Find PostgreSQL bin directory (usually `C:\Program Files\PostgreSQL\15\bin`)
2. Add it to your system PATH environment variable
3. Restart Command Prompt

### 4. Test Connection
```cmd
psql -U postgres -h localhost
```
Enter the password you set during installation.

## Database Setup for Education Platform

### 1. Create Database
```sql
CREATE DATABASE education_db;
```

### 2. Exit psql
```sql
\q
```

### 3. Initialize Database Schema
```cmd
psql -U postgres -h localhost -d education_db -f backend/init.sql
```

### 4. Update Environment File
Edit `backend/.env`:
```env
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/education_db
```
Replace `YOUR_PASSWORD` with the password you set for the postgres user.

## Alternative: Using pgAdmin

If you prefer a GUI:

1. Open pgAdmin 4
2. Connect to PostgreSQL server (localhost)
3. Right-click "Databases" → Create → Database
4. Name: `education_db`
5. Right-click the new database → Query Tool
6. Open and run `backend/init.sql`

## Troubleshooting

### "psql: command not found"
- Add PostgreSQL bin directory to PATH
- Restart command prompt
- Try full path: `"C:\Program Files\PostgreSQL\15\bin\psql" --version`

### "Connection refused"
- Check if PostgreSQL service is running
- Windows Services → PostgreSQL service → Start
- Or restart your computer

### "Authentication failed"
- Double-check your password
- Try connecting with pgAdmin first
- Reset password if needed

### "Database does not exist"
- Make sure you created the `education_db` database
- Check database list: `psql -U postgres -l`

## Quick Commands

```cmd
# Connect to PostgreSQL
psql -U postgres -h localhost

# List databases
\l

# Connect to specific database
\c education_db

# List tables
\dt

# Exit
\q
```