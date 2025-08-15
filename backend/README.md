# Education Platform - NestJS Backend

## Overview

A comprehensive education management platform backend built with NestJS, TypeScript, TypeORM, and PostgreSQL. Features JWT authentication, role-based access control, and complete CRUD operations for educational entities.

## Technology Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport
- **Documentation**: Swagger/OpenAPI 3.0
- **Containerization**: Docker & Docker Compose
- **Validation**: Class-validator & Class-transformer

## Key Features

### 🔐 Authentication & Authorization
- JWT-based authentication with Passport
- Role-based access control (Admin, Teacher, Student, Parent)
- Secure password hashing with bcrypt
- Token-based session management

### 📚 Core Functionality
- **User Management**: Complete user lifecycle management
- **Course Management**: Course creation, enrollment, and management
- **Assignment System**: Assignment creation, submission, and grading
- **Class Sessions**: Session scheduling and attendance tracking
- **Content Management**: Course content organization and delivery
- **Analytics**: System-wide analytics and reporting
- **Notifications**: User notification system

### 🏗️ Architecture
- **Code-First Database Design**: TypeORM entities with auto-synchronization
- **Modular Structure**: Feature-based module organization
- **Global Exception Handling**: Consistent error responses
- **Request/Response Logging**: Comprehensive logging system
- **API Documentation**: Interactive Swagger documentation

## Project Structure

```
nestjs-backend/
├── src/
│   ├── main.ts                     # Application entry point
│   ├── app.module.ts              # Root module
│   ├── app.controller.ts          # Root controller
│   ├── app.service.ts             # Root service
│   ├── common/                    # Shared utilities
│   │   ├── decorators/            # Custom decorators
│   │   ├── enums/                 # Enums and constants
│   │   ├── filters/               # Exception filters
│   │   ├── guards/                # Authentication guards
│   │   └── interceptors/          # Request interceptors
│   └── modules/                   # Feature modules
│       ├── auth/                  # Authentication module
│       ├── users/                 # User management
│       ├── courses/               # Course management
│       ├── students/              # Student operations
│       ├── teachers/              # Teacher operations
│       ├── admin/                 # Admin operations
│       ├── assignments/           # Assignment management
│       ├── sessions/              # Class sessions
│       ├── content/               # Course content
│       ├── analytics/             # System analytics
│       ├── notifications/         # Notification system
│       └── health/                # Health checks
├── docker-compose.yml             # Docker services
├── Dockerfile                     # Application container
├── package.json                   # Dependencies
└── README.md                      # This file
```

## Database Schema

### Entities (Auto-generated via TypeORM)

- **Users**: User accounts with role-based access
- **Courses**: Course information and metadata
- **Enrollments**: Student-course relationships
- **Assignments**: Course assignments and tasks
- **Submissions**: Student assignment submissions
- **ClassSessions**: Scheduled class sessions
- **Attendance**: Student attendance records
- **Content**: Course content and materials
- **Notifications**: User notifications

### Relationships

- Users → Courses (One-to-Many: Instructor)
- Users → Enrollments (One-to-Many: Student)
- Courses → Enrollments (One-to-Many)
- Courses → Assignments (One-to-Many)
- Assignments → Submissions (One-to-Many)
- Courses → ClassSessions (One-to-Many)
- ClassSessions → Attendance (One-to-Many)

## Getting Started

### Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- PostgreSQL (if not using Docker)

### Installation

1. **Clone and Install**
   ```bash
   cd nestjs-backend
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

3. **Database Setup (Docker)**
   ```bash
   npm run docker:up
   ```

4. **Start Development Server**
   ```bash
   npm run start:dev
   ```

### Environment Variables

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=education_platform

# Application Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# CORS Configuration
CLIENT_URL=http://localhost:3000
```

## API Documentation

### Swagger UI
- **URL**: `http://localhost:3000/api/docs`
- **Features**: Interactive API testing, JWT authentication, request/response examples

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

#### Courses
- `GET /api/courses` - List all courses
- `POST /api/courses` - Create course (Admin/Teacher)
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course (Admin)

#### Students
- `GET /api/students/courses` - Get enrolled courses
- `GET /api/students/available-courses` - Browse available courses
- `POST /api/students/enroll/:courseId` - Enroll in course
- `GET /api/students/assignments` - View assignments
- `POST /api/students/assignments/:id/submit` - Submit assignment

#### Admin
- `GET /api/admin/dashboard` - System statistics
- `GET /api/admin/users` - Manage users
- `GET /api/admin/courses` - Manage courses

#### Analytics
- `GET /api/analytics/overview` - System overview
- `GET /api/analytics/user-growth` - User growth data
- `GET /api/analytics/course-popularity` - Course popularity

## Development

### Available Scripts

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugging

# Production
npm run build              # Build application
npm run start:prod         # Start production server

# Testing
npm run test               # Run unit tests
npm run test:e2e           # Run e2e tests
npm run test:cov           # Run tests with coverage

# Docker
npm run docker:up          # Start Docker services
npm run docker:down        # Stop Docker services
npm run docker:logs        # View Docker logs

# Code Quality
npm run lint               # Lint code
npm run format             # Format code
```

### Database Management

The application uses TypeORM with **synchronize: true** in development, which means:
- Database schema is automatically created/updated
- No manual migrations needed
- Tables are generated from TypeScript entities
- Schema changes are applied automatically

### Adding New Features

1. **Create Entity**
   ```typescript
   // src/modules/example/entities/example.entity.ts
   @Entity('examples')
   export class Example {
     @PrimaryGeneratedColumn()
     id: number;
     
     @Column()
     name: string;
   }
   ```

2. **Create Service**
   ```typescript
   // src/modules/example/example.service.ts
   @Injectable()
   export class ExampleService {
     constructor(
       @InjectRepository(Example)
       private exampleRepository: Repository<Example>,
     ) {}
   }
   ```

3. **Create Controller**
   ```typescript
   // src/modules/example/example.controller.ts
   @ApiTags('Example')
   @Controller('example')
   export class ExampleController {
     constructor(private exampleService: ExampleService) {}
   }
   ```

4. **Create Module**
   ```typescript
   // src/modules/example/example.module.ts
   @Module({
     imports: [TypeOrmModule.forFeature([Example])],
     controllers: [ExampleController],
     providers: [ExampleService],
   })
   export class ExampleModule {}
   ```

## Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Build application image
docker build -t education-platform-api .

# Run container
docker run -p 3000:3000 education-platform-api
```

### Production Checklist

- [ ] Set NODE_ENV=production
- [ ] Configure production database
- [ ] Set secure JWT secret
- [ ] Configure CORS for production domains
- [ ] Enable SSL/HTTPS
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Set up backup strategy

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Role-based Access Control**: Granular permissions
- **Input Validation**: Class-validator for request validation
- **SQL Injection Protection**: TypeORM parameterized queries
- **CORS Configuration**: Controlled cross-origin access
- **Rate Limiting**: Request throttling (configurable)

## Performance Considerations

- **Database Connection Pooling**: Efficient connection management
- **Query Optimization**: Proper relations and indexing
- **Response Compression**: Automatic compression
- **Caching**: Ready for Redis integration
- **Pagination**: Built-in pagination support

## Monitoring & Logging

- **Request Logging**: Comprehensive request/response logging
- **Error Tracking**: Global exception filters
- **Health Checks**: Application health monitoring
- **Performance Metrics**: Response time tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

---

## Quick Commands

```bash
# Setup and Development
npm install                # Install dependencies
npm run docker:up          # Start database
npm run start:dev          # Start development server

# Access Points
http://localhost:3000/api                    # API endpoints
http://localhost:3000/api/docs               # Swagger documentation
http://localhost:3000/api/health             # Health check
http://localhost:5050                        # pgAdmin (admin@education.com / admin)

# Database Access
docker exec -it education-platform-db psql -U postgres -d education_platform
```

---

*Built with ❤️ using NestJS, TypeScript, and PostgreSQL*