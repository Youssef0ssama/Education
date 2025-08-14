# Education Platform

A comprehensive full-stack education platform built with React, Node.js, Express, and PostgreSQL. Features multiple user dashboards, content management, video conferencing integration, and robust user management.

## 🚀 Features

### Multi-Role Dashboard System
- **Student Dashboard**: Course progress, assignments, schedule, grades
- **Teacher Dashboard**: Class management, student progress, content creation
- **Parent Dashboard**: Children's progress monitoring, communication
- **Admin Dashboard**: Platform analytics, user management, system settings

### Core Functionality
- 🔐 **Authentication & Authorization** with JWT and 2FA support
- 👥 **User Management** (Students, Teachers, Parents, Admins)
- 📚 **Course Management** with enrollment and progress tracking
- 📝 **Assignment System** with submissions and grading
- 📅 **Class Scheduling** with Zoom integration
- 💰 **Payment Processing** with discount coupons
- 📊 **Analytics & Reporting** for performance tracking
- 💬 **Communication System** with notifications
- 📁 **Content Management** for educational materials

## 🏗️ Architecture

```
├── frontend/          # React + Vite + Tailwind CSS
├── backend/           # Node.js + Express + PostgreSQL
├── scripts/           # Development and deployment scripts
├── docker-compose.yml # Production setup
└── docker-compose.dev.yml # Development setup
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Git

### Local Development Setup

#### Windows
```cmd
# Install dependencies
scripts\install-local.bat

# Setup database
scripts\setup-local-db.bat

# Start development servers
scripts\start-local.bat
```

#### Manual Setup

1. **Install Dependencies**
```bash
# Backend
cd backend
npm install --legacy-peer-deps

# Frontend
cd frontend
npm install --legacy-peer-deps
```

2. **Setup PostgreSQL Database**
```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE education_db;

-- Run the initialization script
\i backend/init.sql
```

3. **Configure Environment**
```bash
# Copy and edit environment file
cp backend/.env.example backend/.env
# Update DATABASE_URL with your PostgreSQL credentials
```

4. **Start Services**
```bash
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

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Dashboards
- `GET /api/dashboard/student` - Student dashboard data
- `GET /api/dashboard/teacher` - Teacher dashboard data
- `GET /api/dashboard/parent` - Parent dashboard data
- `GET /api/dashboard/admin` - Admin dashboard data

### Legacy Endpoints
- `GET /users` - Get all users
- `GET /courses` - Get all courses
- `GET /health` - System health check

## 🗄️ Database Schema

### Core Tables
- **users** - User accounts with roles and authentication
- **courses** - Course information and settings
- **enrollments** - Student-course relationships with progress
- **class_sessions** - Scheduled classes with Zoom integration
- **assignments** - Course assignments and submissions
- **content** - Educational materials and resources
- **transactions** - Payment and financial records
- **notifications** - System and user notifications

### Relationships
- **parent_student_relationships** - Parent-child connections
- **attendance** - Class attendance tracking
- **submissions** - Assignment submissions and grades
- **messages** - Communication between users

## 🔐 Security Features

- JWT-based authentication with token expiration
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- CORS protection
- Helmet.js security headers
- Input validation and sanitization
- Role-based access control (RBAC)
- Two-factor authentication support

## 🛠️ Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgres://postgres:Admin@123@db:5432/education_db
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ZOOM_API_KEY=your-zoom-api-key
ZOOM_API_SECRET=your-zoom-api-secret
STRIPE_SECRET_KEY=sk_test_your_stripe_key
```

### Frontend
```env
VITE_API_URL=http://localhost:5000
```

## 🚀 Deployment

### Production Deployment
1. Install PostgreSQL on production server
2. Create production database and run `backend/init.sql`
3. Build frontend: `cd frontend && npm run build`
4. Configure production environment variables
5. Start backend: `cd backend && npm start`
6. Serve frontend build with nginx or similar

## 🧪 Development

### Adding New Features
1. Create database migrations in `backend/init.sql`
2. Add API routes in `backend/src/routes/`
3. Create React components in `frontend/src/components/`
4. Update authentication middleware if needed

### Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🔧 Troubleshooting

### Common Issues

**Database Connection Failed**
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists

**Frontend Can't Connect to Backend**
- Check if backend is running on port 5000
- Verify VITE_API_URL configuration
- Check browser console for CORS errors

**PostgreSQL Issues**
- Ensure PostgreSQL service is running
- Check if database exists: `psql -U postgres -l`
- Verify connection: `psql -U postgres -h localhost -d education_db`
- Check PostgreSQL logs for errors

**Port Conflicts**
- Change port mappings in docker-compose files
- Update environment variables accordingly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

---

Built with ❤️ for education