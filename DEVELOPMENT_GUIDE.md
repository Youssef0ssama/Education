# 🌟 Baraem Al-Noor Islamic Education Platform - Development Guide

## 📋 Quick Access Links

### 🌐 Application URLs
| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | [http://localhost:5173](http://localhost:5173) | React + Vite Development Server |
| **Backend API** | [http://localhost:3001](http://localhost:3001) | NestJS API Server |
| **Swagger API Docs** | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) | Interactive API Documentation |
| **pgAdmin** | [http://localhost:5050](http://localhost:5050) | PostgreSQL Database Management |

### 🗄️ Database Access
| Service | Host | Port | Credentials |
|---------|------|------|-------------|
| **PostgreSQL** | localhost | 5432 | User: `postgres`, Password: `Admin123!`, DB: `education_platform` |
| **pgAdmin** | localhost | 5050 | Email: `admin@education.com`, Password: `admin` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Docker & Docker Compose
- Git

### 1. Start Database Services
```bash
cd backend
docker-compose up -d
```

### 2. Start Backend Server
```bash
cd backend
npm install
npm run start:dev
```

### 3. Start Frontend Server
```bash
cd frontend
npm install
npm run dev
```

---

## 👥 Demo User Accounts

### 🔐 Login Credentials
All demo accounts use the password: **`password123`**

| Role | Email | Name | Access Level |
|------|-------|------|--------------|
| **Admin** | `admin@education.com` | Admin User | Full platform management |
| **Teacher** | `jane.teacher@education.com` | Jane Teacher | Course and student management |
| **Student** | `john.student@education.com` | John Student | Learning and assignments |
| **Parent** | `mary.parent@education.com` | Mary Parent | Child progress monitoring |

---

## 🎨 Platform Features

### 🏠 Home Page Features
- ✅ Islamic branding with Arabic text "براعم النور" (Baraem Al-Noor)
- ✅ Green and blue color theme
- ✅ Responsive design
- ✅ Login button in navigation
- ✅ Hero section with Islamic education focus
- ✅ Services showcase
- ✅ About section
- ✅ Contact footer

### 👨‍💼 Admin Dashboard
- ✅ User management
- ✅ Course management
- ✅ System analytics
- ✅ Assignment management
- ✅ Session management
- ✅ System settings

### 👩‍🏫 Teacher Dashboard
- ✅ Course management
- ✅ Student management
- ✅ Content management
- ✅ Assignment grading
- ✅ Session scheduling
- ✅ Teaching analytics

### 👨‍🎓 Student Dashboard
- ✅ Course catalog
- ✅ Course materials
- ✅ Assignment submission
- ✅ Grade tracking
- ✅ Schedule viewing

### 👨‍👩‍👧‍👦 Parent Dashboard
- ✅ Children management
- ✅ Progress monitoring
- ✅ Grade tracking
- ✅ Attendance reports
- ✅ Teacher communication

---

## 🛠️ Development Commands

### Backend Commands
```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod

# Database operations
npm run migration:generate
npm run migration:run
npm run seed:run

# Testing
npm run test
npm run test:e2e
```

### Frontend Commands
```bash
# Development
npm run dev

# Production build
npm run build
npm run preview

# Linting
npm run lint
npm run lint:fix
```

### Docker Commands
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild services
docker-compose up -d --build
```

---

## 📊 Database Management

### pgAdmin Setup
1. Open [http://localhost:5050](http://localhost:5050)
2. Login with:
   - Email: `admin@education.com`
   - Password: `admin`
3. Add server connection:
   - Host: `postgres` (container name)
   - Port: `5432`
   - Username: `postgres`
   - Password: `Admin123!`
   - Database: `education_platform`

### Direct Database Connection
```bash
# Using psql
psql -h localhost -p 5432 -U postgres -d education_platform

# Connection string
postgresql://postgres:Admin123!@localhost:5432/education_platform
```

---

## 🔧 API Documentation

### Swagger UI
- **URL**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- **Features**: Interactive API testing, request/response examples, authentication

### Quick API Test
Before using Swagger, verify the API is working:

**Option 1: Using curl**
```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Expected response:
# {"status":"ok","database":"connected","version":"1.0.0","timestamp":"...","uptime":...}
```

**Option 2: Using test script**
```bash
cd backend
node test-api.js
```

If the health endpoint returns 404, the server is not running properly.

### Main API Endpoints
| Module | Base Path | Description |
|--------|-----------|-------------|
| **Auth** | `/api/auth` | Authentication & registration |
| **Users** | `/api/users` | User management |
| **Courses** | `/api/courses` | Course operations |
| **Students** | `/api/students` | Student-specific features |
| **Teachers** | `/api/teachers` | Teacher-specific features |
| **Parents** | `/api/parent` | Parent-specific features |
| **Admin** | `/api/admin` | Admin operations |

---

## 🎯 Islamic Education Content

### Course Categories
- 📖 **Quran Memorization** - Structured Hifz programs
- 🔤 **Arabic Language** - Reading, writing, and comprehension
- 🕌 **Islamic Studies** - History, principles, and values
- 🤲 **Islamic Ethics** - Character development and morals

### Features
- ✅ Arabic text support
- ✅ Islamic calendar integration
- ✅ Prayer time notifications
- ✅ Islamic content management
- ✅ Parent-child progress tracking

---

## 🔒 Security Features

### Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Session management

### Authorization Roles
- **Admin**: Full system access
- **Teacher**: Course and student management
- **Student**: Learning resources and assignments
- **Parent**: Child progress monitoring

---

## 🐛 Troubleshooting

### Common Issues

#### Frontend not loading
```bash
# Check if Vite server is running
npm run dev

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Backend API errors
```bash
# Check if NestJS server is running
npm run start:dev

# Test if API is responding
curl http://localhost:3001/api/health

# Check database connection
docker-compose ps

# Check server logs
npm run start:dev (watch for errors)
```

#### Swagger 404 errors
The correct Swagger URL is: **http://localhost:3001/api/docs**

**Common fixes:**
1. Make sure backend server is running on port 3001
2. Check if all modules are properly imported in app.module.ts
3. Verify the server started without errors
4. Test basic API endpoint first: http://localhost:3001/api/health

#### Database connection issues
```bash
# Restart database services
docker-compose restart postgres

# Check database logs
docker-compose logs postgres
```

#### Port conflicts
- Frontend (Vite): Port 5173
- Backend (NestJS): Port 3001
- Database (PostgreSQL): Port 5432
- pgAdmin: Port 5050

---

## 📝 Development Notes

### Code Structure
```
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   ├── common/         # Shared utilities
│   │   └── database/       # Database config & seeds
│   └── docker-compose.yml  # Database services
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── components/     # React components
│   │   └── assets/         # Static assets
└── DEVELOPMENT_GUIDE.md    # This file
```

### Theme Colors
- **Primary Green**: `#16a34a` (green-600)
- **Secondary Blue**: `#2563eb` (blue-600)
- **Gradient**: Green to Blue
- **Background**: Light gray (`#f9fafb`)

### Typography
- **Arabic Text**: "براعم النور"
- **English Text**: "Baraem Al-Noor"
- **Font**: System fonts with Arabic support

---

## 📞 Support

### Development Team
- **Platform**: Islamic Education Management System
- **Theme**: Baraem Al-Noor (براعم النور)
- **Focus**: Comprehensive Islamic education for children

### Quick Links Summary
- 🌐 **Frontend**: [localhost:5173](http://localhost:5173)
- 🔧 **Backend**: [localhost:3001](http://localhost:3001)
- 📚 **API Docs**: [localhost:3001/api/docs](http://localhost:3001/api/docs)
- 🗄️ **pgAdmin**: [localhost:5050](http://localhost:5050)

---

*Last updated: $(date)*
*Platform: Baraem Al-Noor Islamic Education Platform*