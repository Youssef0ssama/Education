# Installation Guide

## 🚀 Quick Setup (Local Development)

### Windows
```cmd
scripts\install-local.bat
scripts\setup-local-db.bat
scripts\start-local.bat
```

### Prerequisites
- Node.js 18+
- PostgreSQL 12+

## 🔧 Manual Installation

If the automated scripts fail, follow these steps:

### 1. Install Backend Dependencies

```cmd
cd backend
npm cache clean --force
npm install --legacy-peer-deps
```

If that fails, try:
```cmd
npm install --force
```

**Test the installation:**
```cmd
node test-start.js
```

### 2. Install Frontend Dependencies

```cmd
cd frontend
npm install --legacy-peer-deps
```

If that fails, try:
```cmd
npm install --force
```

### 3. Setup Environment

```cmd
copy backend\.env.example backend\.env
```

Edit `backend\.env` with your settings (the defaults work for development).

### 4. Start Development

#### Start Development Servers
```cmd
# Option A: Automatic (opens 2 windows)
scripts\start-local.bat

# Option B: Manual (2 terminals needed)
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
npm run dev
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Database**: localhost:5432
- **Health Check**: http://localhost:5000/health

## 👤 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@education.com | password123 |
| Teacher | jane.teacher@education.com | password123 |
| Student | john.student@education.com | password123 |
| Parent | mary.parent@education.com | password123 |

## 🔍 Troubleshooting

### Backend Won't Start

**Error: Cannot find package 'speakeasy'**
- ✅ Fixed: Removed speakeasy dependency
- Run: `npm install --legacy-peer-deps`

**Error: Module not found**
- Delete `node_modules` and `package-lock.json`
- Run: `npm cache clean --force`
- Run: `npm install --legacy-peer-deps`

**Test backend dependencies:**
```cmd
cd backend
node test-start.js
```

### Frontend Issues

**Dependency conflicts:**
- Try: `npm install --legacy-peer-deps`
- Try: `npm install --force`
- Clear cache: `npm cache clean --force`

### Database Issues

**Connection failed:**
- Ensure Docker is running
- Check if port 5432 is available
- Try: `docker-compose down` then `docker-compose up --build`

**Database not initializing:**
- Check logs: `docker-compose logs db`
- Restart: `docker-compose restart db`

### Port Conflicts

**Ports 3000, 5000, or 5432 in use:**
- Change ports in `docker-compose.dev.yml`
- Update environment variables accordingly
- Or stop conflicting services

### Permission Issues (Linux/Mac)

```bash
chmod +x scripts/*.sh
sudo chown -R $USER:$USER node_modules
```

## 🧪 Testing Installation

### Test Backend
```cmd
cd backend
node test-start.js
npm run dev
```

### Test Frontend
```cmd
cd frontend
npm run dev
```

### Test Full Stack
1. Start database: `docker run --name education-db -e POSTGRES_PASSWORD=Admin@123 -e POSTGRES_DB=education_db -p 5432:5432 -d postgres:15`
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `cd frontend && npm run dev`
4. Visit: http://localhost:3000
5. Login with demo account

## 📝 Common Solutions

### "Cannot find module" errors
```cmd
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
```

### "Port already in use" errors
```cmd
# Find and kill process using port
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Docker issues
```cmd
docker-compose down
docker system prune -f
docker-compose up --build
```

## 🆘 Still Having Issues?

1. Check the main README.md for more details
2. Ensure you have Node.js 18+ installed
3. Ensure Docker is running (for database)
4. Try the manual installation steps
5. Check the console for specific error messages