import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import pool from "./config/database.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import usersRoutes from "./routes/users.js";
import coursesRoutes from "./routes/courses.js";
import assignmentsRoutes from "./routes/assignments.js";
import sessionsRoutes from "./routes/sessions.js";
import parentRoutes from "./routes/parent.js";
import studentRoutes from "./routes/student.js";
import contentRoutes from "./routes/content.js";
import studentCoursesRoutes from "./routes/student-courses.js";
import adminCoursesRoutes from "./routes/admin-courses.js";
import teacherCoursesRoutes from "./routes/teacher-courses.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'file://', 'null'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests
app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Custom middleware to handle text/plain as JSON (for CORS issues with file:// protocol)
app.use((req, res, next) => {
  if (req.headers['content-type'] === 'text/plain;charset=UTF-8' && req.method !== 'GET') {
    req.headers['content-type'] = 'application/json';
  }
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API info route
app.get('/api', (req, res) => {
  res.json({
    message: "Education Platform API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      auth: "/api/auth",
      admin: "/api/admin",
      teacher: "/api/teacher",
      student: "/api/student",
      dashboard: "/api/dashboard",
      health: "/health"
    }
  });
});

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({
    message: "API test endpoint working",
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: req.headers
  });
});

// Test POST endpoint for debugging
app.post('/api/test-post', (req, res) => {
  console.log('Test POST request received:');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Body type:', typeof req.body);

  res.json({
    message: "Test POST endpoint working",
    receivedBody: req.body,
    bodyType: typeof req.body,
    hasTitle: !!req.body?.title,
    hasDescription: !!req.body?.description
  });
});

// Admin endpoint to apply schema fixes
app.post('/api/admin/apply-schema', async (req, res) => {
  try {
    console.log('🔧 Applying schema fixes...');

    // Add missing columns to courses table
    const alterStatements = [
      `ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'intermediate'`,
      `ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)`,
      `ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN DEFAULT false`,
      `ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisites INTEGER[] DEFAULT '{}'`,
      `ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrollment_start_date TIMESTAMP`,
      `ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrollment_end_date TIMESTAMP`,
      `ALTER TABLE courses ADD COLUMN IF NOT EXISTS last_modified_by INTEGER REFERENCES users(id)`,
      `ALTER TABLE courses ADD COLUMN IF NOT EXISTS last_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE courses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived'))`
    ];

    const results = [];

    for (const statement of alterStatements) {
      try {
        await pool.query(statement);
        results.push({ statement: statement.substring(0, 50) + '...', status: 'success' });
      } catch (error) {
        if (error.message.includes('already exists')) {
          results.push({ statement: statement.substring(0, 50) + '...', status: 'exists' });
        } else {
          results.push({ statement: statement.substring(0, 50) + '...', status: 'error', error: error.message });
        }
      }
    }

    // Create course_instructors table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS course_instructors (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(id),
        assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        is_primary BOOLEAN DEFAULT false,
        permissions JSONB DEFAULT '{"can_upload": true, "can_grade": true, "can_manage_students": true}',
        notes TEXT,
        UNIQUE(course_id, instructor_id)
      )
    `;

    try {
      await pool.query(createTableSQL);
      results.push({ statement: 'CREATE TABLE course_instructors', status: 'success' });
    } catch (error) {
      if (error.message.includes('already exists')) {
        results.push({ statement: 'CREATE TABLE course_instructors', status: 'exists' });
      } else {
        results.push({ statement: 'CREATE TABLE course_instructors', status: 'error', error: error.message });
      }
    }

    // Create other missing tables
    const otherTables = [
      {
        name: 'course_materials',
        sql: `CREATE TABLE IF NOT EXISTS course_materials (
          id SERIAL PRIMARY KEY,
          course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          file_path VARCHAR(500),
          file_type VARCHAR(50),
          file_size INTEGER,
          uploaded_by INTEGER REFERENCES users(id),
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          order_index INTEGER DEFAULT 0
        )`
      },
      {
        name: 'course_waitlist',
        sql: `CREATE TABLE IF NOT EXISTS course_waitlist (
          id SERIAL PRIMARY KEY,
          course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          position INTEGER,
          is_active BOOLEAN DEFAULT true,
          notified BOOLEAN DEFAULT false,
          UNIQUE(course_id, student_id)
        )`
      }
    ];

    for (const table of otherTables) {
      try {
        await pool.query(table.sql);
        results.push({ statement: `CREATE TABLE ${table.name}`, status: 'success' });
      } catch (error) {
        if (error.message.includes('already exists')) {
          results.push({ statement: `CREATE TABLE ${table.name}`, status: 'exists' });
        } else {
          results.push({ statement: `CREATE TABLE ${table.name}`, status: 'error', error: error.message });
        }
      }
    }

    // Update existing courses to have proper status values
    try {
      const statusUpdate = await pool.query(`
        UPDATE courses 
        SET status = CASE 
          WHEN is_active = true THEN 'active'
          ELSE 'archived'
        END
        WHERE status IS NULL OR status = ''
        RETURNING id, title, status
      `);

      if (statusUpdate.rows.length > 0) {
        results.push({
          statement: `Updated ${statusUpdate.rows.length} courses with proper status`,
          status: 'success'
        });
      }
    } catch (error) {
      results.push({
        statement: 'Update course status values',
        status: 'error',
        error: error.message
      });
    }

    console.log('🎉 Schema fixes applied!');
    res.json({ message: 'Schema fixes applied successfully', results });

  } catch (error) {
    console.error('❌ Schema fix error:', error);
    res.status(500).json({ error: 'Failed to apply schema fixes', details: error.message });
  }
});

// Admin endpoint to cleanup test data
app.post('/api/admin/cleanup-test-data', async (req, res) => {
  try {
    console.log('🧹 Cleaning up test data...');

    const results = [];

    // Delete test courses (keep original courses)
    const testCoursePatterns = [
      'Test Course%',
      'Lifetime Course%',
      'Direct Test Course%'
    ];

    for (const pattern of testCoursePatterns) {
      const result = await pool.query(
        'DELETE FROM courses WHERE title LIKE $1 RETURNING id, title',
        [pattern]
      );

      if (result.rows.length > 0) {
        results.push({
          action: `Deleted courses matching "${pattern}"`,
          count: result.rows.length,
          courses: result.rows.map(c => ({ id: c.id, title: c.title }))
        });
      }
    }

    // Clean up orphaned data
    const orphanedInstructors = await pool.query(`
      DELETE FROM course_instructors 
      WHERE course_id NOT IN (SELECT id FROM courses)
      RETURNING id
    `);

    const orphanedEnrollments = await pool.query(`
      DELETE FROM enrollments 
      WHERE course_id NOT IN (SELECT id FROM courses)
      RETURNING id
    `);

    if (orphanedInstructors.rows.length > 0) {
      results.push({
        action: 'Cleaned orphaned course_instructors',
        count: orphanedInstructors.rows.length
      });
    }

    if (orphanedEnrollments.rows.length > 0) {
      results.push({
        action: 'Cleaned orphaned enrollments',
        count: orphanedEnrollments.rows.length
      });
    }

    console.log('🎉 Test data cleanup completed!');
    res.json({ message: 'Test data cleaned up successfully', results });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup test data', details: error.message });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin', adminCoursesRoutes);
app.use('/api/teacher', teacherCoursesRoutes);
app.use('/api/student', studentCoursesRoutes);

// Debug route to test database
app.get('/api/debug/db', async (req, res) => {
  try {
    // Test basic connection
    const connectionTest = await pool.query('SELECT NOW() as current_time');

    // Test if users table exists
    const tableTest = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);

    // Count users
    let userCount = 0;
    if (tableTest.rows.length > 0) {
      const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
      userCount = countResult.rows[0].count;
    }

    res.json({
      status: 'success',
      database_time: connectionTest.rows[0].current_time,
      users_table_exists: tableTest.rows.length > 0,
      user_count: userCount,
      message: 'Database connection successful'
    });
  } catch (error) {
    console.error('Database debug error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      code: error.code
    });
  }
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      timestamp: new Date().toISOString()
    });
  }
});

// Legacy endpoints for backward compatibility
app.get("/", (req, res) => {
  res.json({
    message: "Education Platform API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      dashboard: "/api/dashboard",
      health: "/health"
    }
  });
});

app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email, role, created_at FROM users WHERE is_active = true");
    res.json(result.rows);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.get("/courses", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.title, c.description, c.price, c.duration_weeks, c.max_students,
             u.name as instructor_name, u.email as instructor_email,
             COUNT(e.id) as enrolled_students
      FROM courses c 
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      WHERE c.is_active = true
      GROUP BY c.id, c.title, c.description, c.price, c.duration_weeks, c.max_students, u.name, u.email
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 API endpoints: http://localhost:${PORT}/api`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error(`💡 Solutions:`);
    console.error(`   1. Kill the process using port ${PORT}:`);
    console.error(`      netstat -ano | findstr :${PORT}`);
    console.error(`      taskkill /PID [PID] /F`);
    console.error(`   2. Or run: scripts\\kill-port-5000.bat`);
    console.error(`   3. Or change PORT in .env file to 5001`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});
