import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all courses
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, instructor_id, is_active, search } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['1=1']; // Always true condition to simplify query building
    let queryParams = [];
    let paramIndex = 1;

    // Filter by instructor
    if (instructor_id) {
      whereConditions.push(`c.instructor_id = $${paramIndex}`);
      queryParams.push(instructor_id);
      paramIndex++;
    }

    // Filter by active status
    if (is_active !== undefined) {
      whereConditions.push(`c.is_active = $${paramIndex}`);
      queryParams.push(is_active === 'true');
      paramIndex++;
    }

    // Search by title or description
    if (search) {
      whereConditions.push(`(c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM courses c 
      LEFT JOIN users u ON c.instructor_id = u.id 
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get courses with pagination
    const coursesQuery = `
      SELECT 
        c.id, c.title, c.description, c.price, c.duration_weeks, c.max_students, c.is_active, c.created_at, c.updated_at,
        u.name as instructor_name, u.email as instructor_email,
        COUNT(e.id) as enrolled_students,
        AVG(e.progress_percentage) as avg_progress
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      WHERE ${whereClause}
      GROUP BY c.id, c.title, c.description, c.price, c.duration_weeks, c.max_students, c.is_active, c.created_at, c.updated_at, u.name, u.email
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const coursesResult = await pool.query(coursesQuery, queryParams);

    res.json({
      courses: coursesResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const courseResult = await pool.query(`
      SELECT 
        c.id, c.title, c.description, c.price, c.duration_weeks, c.max_students, c.is_active, c.created_at, c.updated_at,
        u.name as instructor_name, u.email as instructor_email, u.id as instructor_id
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.id = $1
    `, [id]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];

    // Get enrolled students
    const studentsResult = await pool.query(`
      SELECT 
        u.id, u.name, u.email, 
        e.enrollment_date, e.status, e.progress_percentage, e.final_grade
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.course_id = $1
      ORDER BY e.enrollment_date DESC
    `, [id]);

    course.enrolled_students = studentsResult.rows;

    // Get course content
    const contentResult = await pool.query(`
      SELECT id, title, description, content_type, file_url, duration_minutes, order_index, is_public, created_at
      FROM content
      WHERE course_id = $1
      ORDER BY order_index, created_at
    `, [id]);

    course.content = contentResult.rows;

    // Get assignments
    const assignmentsResult = await pool.query(`
      SELECT id, title, description, due_date, max_points, assignment_type, created_at
      FROM assignments
      WHERE course_id = $1
      ORDER BY due_date DESC
    `, [id]);

    course.assignments = assignmentsResult.rows;

    res.json({ course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new course (Admin or Teacher)
router.post('/', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, description, price, duration_weeks, max_students, instructor_id } = req.body;
    const requestingUserRole = req.user.role;
    const requestingUserId = req.user.id;

    // Validation
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Determine instructor
    let finalInstructorId = instructor_id;
    
    if (requestingUserRole === 'teacher') {
      // Teachers can only create courses for themselves
      finalInstructorId = requestingUserId;
    } else if (requestingUserRole === 'admin') {
      // Admin must specify an instructor
      if (!instructor_id) {
        return res.status(400).json({ error: 'Instructor ID is required' });
      }
      
      // Verify instructor exists and is a teacher
      const instructorResult = await pool.query('SELECT id FROM users WHERE id = $1 AND role = $2 AND is_active = true', [instructor_id, 'teacher']);
      if (instructorResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid instructor ID' });
      }
    }

    // Create course
    const result = await pool.query(`
      INSERT INTO courses (title, description, instructor_id, price, duration_weeks, max_students, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, title, description, instructor_id, price, duration_weeks, max_students, is_active, created_at
    `, [title, description, finalInstructorId, price || 0, duration_weeks || 1, max_students || 30, true]);

    const course = result.rows[0];

    // Get instructor info
    const instructorResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [finalInstructorId]);
    course.instructor_name = instructorResult.rows[0]?.name;
    course.instructor_email = instructorResult.rows[0]?.email;

    res.status(201).json({
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update course (Admin or Course Instructor)
router.put('/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, duration_weeks, max_students, is_active } = req.body;
    const requestingUserRole = req.user.role;
    const requestingUserId = req.user.id;

    // Check if course exists and get instructor info
    const courseResult = await pool.query('SELECT instructor_id FROM courses WHERE id = $1', [id]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];

    // Check permissions: teachers can only edit their own courses
    if (requestingUserRole === 'teacher' && course.instructor_id !== requestingUserId) {
      return res.status(403).json({ error: 'You can only edit your own courses' });
    }

    // Build update query dynamically
    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      queryParams.push(title);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      queryParams.push(description);
      paramIndex++;
    }

    if (price !== undefined) {
      updateFields.push(`price = $${paramIndex}`);
      queryParams.push(price);
      paramIndex++;
    }

    if (duration_weeks !== undefined) {
      updateFields.push(`duration_weeks = $${paramIndex}`);
      queryParams.push(duration_weeks);
      paramIndex++;
    }

    if (max_students !== undefined) {
      updateFields.push(`max_students = $${paramIndex}`);
      queryParams.push(max_students);
      paramIndex++;
    }

    // Only admin can change active status
    if (is_active !== undefined && requestingUserRole === 'admin') {
      updateFields.push(`is_active = $${paramIndex}`);
      queryParams.push(is_active);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    queryParams.push(id);

    const updateQuery = `
      UPDATE courses 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING id, title, description, instructor_id, price, duration_weeks, max_students, is_active, updated_at
    `;

    const result = await pool.query(updateQuery, queryParams);

    res.json({
      message: 'Course updated successfully',
      course: result.rows[0]
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete course (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if course exists
    const courseResult = await pool.query('SELECT id, title FROM courses WHERE id = $1', [id]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];

    // Soft delete by deactivating the course to maintain data integrity
    await pool.query('UPDATE courses SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

    res.json({
      message: 'Course deactivated successfully',
      course: {
        id: course.id,
        title: course.title,
        is_active: false
      }
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enroll student in course (Admin or Student)
router.post('/:id/enroll', authenticateToken, async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const { student_id } = req.body;
    const requestingUserRole = req.user.role;
    const requestingUserId = req.user.id;

    // Determine student ID
    let finalStudentId = student_id;
    
    if (requestingUserRole === 'student') {
      // Students can only enroll themselves
      finalStudentId = requestingUserId;
    } else if (requestingUserRole === 'admin') {
      // Admin must specify a student
      if (!student_id) {
        return res.status(400).json({ error: 'Student ID is required' });
      }
      
      // Verify student exists and is a student
      const studentResult = await pool.query('SELECT id FROM users WHERE id = $1 AND role = $2 AND is_active = true', [student_id, 'student']);
      if (studentResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid student ID' });
      }
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check if course exists and is active
    const courseResult = await pool.query('SELECT id, title, max_students FROM courses WHERE id = $1 AND is_active = true', [courseId]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or inactive' });
    }

    const course = courseResult.rows[0];

    // Check if already enrolled
    const existingEnrollment = await pool.query(
      'SELECT id, status FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [finalStudentId, courseId]
    );

    if (existingEnrollment.rows.length > 0) {
      const enrollment = existingEnrollment.rows[0];
      if (enrollment.status === 'active') {
        return res.status(409).json({ error: 'Student is already enrolled in this course' });
      } else {
        // Reactivate enrollment
        await pool.query(
          'UPDATE enrollments SET status = $1, enrollment_date = CURRENT_TIMESTAMP WHERE id = $2',
          ['active', enrollment.id]
        );
        return res.json({ message: 'Enrollment reactivated successfully' });
      }
    }

    // Check course capacity
    const enrollmentCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE course_id = $1 AND status = $2',
      [courseId, 'active']
    );
    
    const currentEnrollments = parseInt(enrollmentCountResult.rows[0].count);
    if (currentEnrollments >= course.max_students) {
      return res.status(400).json({ error: 'Course is at maximum capacity' });
    }

    // Create enrollment
    const enrollmentResult = await pool.query(`
      INSERT INTO enrollments (student_id, course_id, enrollment_date, status, progress_percentage) 
      VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4) 
      RETURNING id, student_id, course_id, enrollment_date, status, progress_percentage
    `, [finalStudentId, courseId, 'active', 0]);

    res.status(201).json({
      message: 'Student enrolled successfully',
      enrollment: enrollmentResult.rows[0]
    });
  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unenroll student from course (Admin only)
router.delete('/:id/unenroll/:studentId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id: courseId, studentId } = req.params;

    const result = await pool.query(
      'UPDATE enrollments SET status = $1 WHERE student_id = $2 AND course_id = $3 AND status = $4 RETURNING *',
      ['dropped', studentId, courseId, 'active']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Active enrollment not found' });
    }

    res.json({
      message: 'Student unenrolled successfully',
      enrollment: result.rows[0]
    });
  } catch (error) {
    console.error('Unenroll student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;