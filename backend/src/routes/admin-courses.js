import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all courses with detailed information (admin view)
router.get('/courses', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;

    let whereConditions = ['1=1'];
    let queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`c.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`c.category_id = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;

    const coursesResult = await pool.query(`
      SELECT 
        c.*,
        creator.name as created_by_name,
        COUNT(DISTINCT ci.instructor_id) as instructor_count,
        COUNT(DISTINCT e.student_id) FILTER (WHERE e.status = 'active') as active_enrollments,
        ARRAY_AGG(
          DISTINCT jsonb_build_object(
            'id', ci.instructor_id,
            'name', u.name,
            'email', u.email,
            'is_primary', ci.is_primary
          )
        ) FILTER (WHERE ci.instructor_id IS NOT NULL) as instructors
      FROM courses c
      LEFT JOIN users creator ON c.created_by = creator.id
      LEFT JOIN course_instructors ci ON c.id = ci.course_id AND ci.is_active = true
      LEFT JOIN users u ON ci.instructor_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE ${whereClause}
      GROUP BY c.id, creator.name
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset]);

    // Get total count for pagination
    const countResult = await pool.query(`
      SELECT COUNT(DISTINCT c.id) as total
      FROM courses c
      LEFT JOIN course_instructors ci ON c.id = ci.course_id AND ci.is_active = true
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE ${whereClause}
    `, queryParams);

    const totalCourses = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCourses / parseInt(limit));

    res.json({
      courses: coursesResult.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_courses: totalCourses,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get admin courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new course (Admin only)
router.post('/courses', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('=== COURSE CREATION DEBUG ===');
    console.log('Request headers:', req.headers);
    console.log('Request body (raw):', req.body);
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('User from auth:', req.user);

    const {
      title,
      description,
      price = 0,
      max_students = 50,
      difficulty_level = 'intermediate',
      prerequisites = [],
      enrollment_start_date,
      enrollment_end_date,
      instructor_ids = []
    } = req.body;

    const adminId = req.user.id;

    console.log('Extracted course data:', {
      title,
      description,
      price,
      max_students,
      difficulty_level,
      instructor_ids,
      is_lifetime
    });

    // Validate required fields
    if (!title || !description) {
      console.log('Validation failed - missing title or description:', {
        title: !!title,
        description: !!description,
        titleValue: title,
        descriptionValue: description
      });
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Validate instructor IDs if provided
    if (instructor_ids.length > 0) {
      const instructorCheck = await pool.query(`
        SELECT id FROM users 
        WHERE id = ANY($1) AND role = 'teacher'
      `, [instructor_ids]);

      if (instructorCheck.rows.length !== instructor_ids.length) {
        return res.status(400).json({ error: 'One or more instructor IDs are invalid' });
      }
    }

    // Check for duplicate course title
    const duplicateCheck = await pool.query(
      'SELECT id FROM courses WHERE title = $1 AND is_active = true',
      [title]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ error: 'A course with this title already exists' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create the course
      const courseResult = await client.query(`
        INSERT INTO courses (
          title, description, price, max_students,
          difficulty_level, prerequisites,
          enrollment_start_date, enrollment_end_date, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        title, description, price,
        max_students, difficulty_level, prerequisites,
        enrollment_start_date, enrollment_end_date, adminId
      ]);

      const course = courseResult.rows[0];

      // Assign instructors if provided
      const instructors = [];
      for (let i = 0; i < instructor_ids.length; i++) {
        const instructorId = instructor_ids[i];
        const isPrimary = i === 0; // First instructor is primary

        const assignmentResult = await client.query(`
          INSERT INTO course_instructors (
            course_id, instructor_id, assigned_by, is_primary
          ) VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [course.id, instructorId, adminId, isPrimary]);

        // Get instructor details
        const instructorDetails = await client.query(`
          SELECT id, name, email FROM users WHERE id = $1
        `, [instructorId]);

        instructors.push({
          ...instructorDetails.rows[0],
          is_primary: isPrimary,
          assigned_date: assignmentResult.rows[0].assigned_date
        });
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Course created successfully',
        course: {
          ...course,
          instructors,
          active_enrollments: 0,
          available_spots: course.max_students
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update course details (Admin only)
router.put('/courses/:courseId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      title,
      description,
      price,
      max_students,
      difficulty_level,
      prerequisites,
      enrollment_start_date,
      enrollment_end_date,
      status
    } = req.body;

    // Check if course exists
    const courseCheck = await pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check for duplicate title if title is being changed
    if (title && title !== courseCheck.rows[0].title) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM courses WHERE title = $1 AND id != $2 AND is_active = true',
        [title, courseId]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({ error: 'A course with this title already exists' });
      }
    }

    // No duration validation needed since we removed duration_weeks

    // Update course
    const updateResult = await pool.query(`
      UPDATE courses SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        max_students = COALESCE($4, max_students),
        difficulty_level = COALESCE($5, difficulty_level),
        prerequisites = COALESCE($6, prerequisites),
        enrollment_start_date = COALESCE($7, enrollment_start_date),
        enrollment_end_date = COALESCE($8, enrollment_end_date),
        status = COALESCE($9, status),
        last_modified_by = $10,
        last_modified_date = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [
      title, description, price, max_students,
      difficulty_level, prerequisites,
      enrollment_start_date, enrollment_end_date, status, req.user.id, courseId
    ]);

    // Get updated course with instructor information
    const courseWithInstructors = await pool.query(`
      SELECT 
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email,
              'is_primary', ci.is_primary,
              'assigned_date', ci.assigned_date
            ) ORDER BY ci.is_primary DESC, ci.assigned_date ASC
          ) FILTER (WHERE ci.is_active = true), 
          '[]'::json
        ) as instructors
      FROM courses c
      LEFT JOIN course_instructors ci ON c.id = ci.course_id AND ci.is_active = true
      LEFT JOIN users u ON ci.instructor_id = u.id
      WHERE c.id = $1
      GROUP BY c.id
    `, [courseId]);

    res.json({
      message: 'Course updated successfully',
      course: courseWithInstructors.rows[0]
    });

  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Permanently delete course (Admin only)
router.delete('/courses/:courseId', authenticateToken, requireRole(['admin']), async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('=== COURSE DELETION DEBUG ===');
    console.log('Course ID to delete:', req.params.courseId);
    console.log('User requesting deletion:', req.user.email);

    await client.query('BEGIN');

    const { courseId } = req.params;

    // Check if course exists
    const courseCheck = await client.query('SELECT title FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Course not found' });
    }

    const courseTitle = courseCheck.rows[0].title;

    // Check if course has active enrollments
    const activeEnrollmentCheck = await client.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE course_id = $1 AND status = $2',
      [courseId, 'active']
    );

    const activeEnrollments = parseInt(activeEnrollmentCheck.rows[0].count);

    if (activeEnrollments > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Cannot delete course "${courseTitle}" with ${activeEnrollments} active enrollment(s). Please complete or drop all active enrollments first.`,
        active_enrollments: activeEnrollments
      });
    }

    // Log the deletion for audit purposes (skip if table doesn't exist)
    try {
      await client.query(`
        INSERT INTO enrollment_audit_log (course_id, action, performed_by, performed_at, reason, metadata)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
      `, [
        courseId,
        'course_deleted',
        req.user.id,
        'Course permanently deleted by admin',
        JSON.stringify({ course_title: courseTitle, deleted_by: req.user.email })
      ]);
    } catch (auditError) {
      console.log('Audit log failed (table may not exist):', auditError.message);
      // Continue with deletion even if audit log fails
    }

    // Permanently delete course (this will cascade to related tables due to foreign key constraints)
    console.log('Executing DELETE FROM courses WHERE id =', courseId);
    const deleteResult = await client.query('DELETE FROM courses WHERE id = $1 RETURNING id, title', [courseId]);
    console.log('Delete result:', deleteResult.rows);

    await client.query('COMMIT');
    console.log('Course deletion committed successfully');

    res.json({
      message: `Course "${courseTitle}" has been permanently deleted`,
      deleted_course: courseTitle
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Assign instructors to course (Admin only)
router.post('/courses/:courseId/instructors', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { instructor_ids, primary_instructor_id } = req.body;
    const adminId = req.user.id;

    if (!instructor_ids || !Array.isArray(instructor_ids) || instructor_ids.length === 0) {
      return res.status(400).json({ error: 'Instructor IDs are required' });
    }

    // Check if course exists
    const courseCheck = await pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Validate instructor IDs
    const instructorCheck = await pool.query(`
      SELECT id, name, email FROM users 
      WHERE id = ANY($1) AND role = 'teacher'
    `, [instructor_ids]);

    if (instructorCheck.rows.length !== instructor_ids.length) {
      return res.status(400).json({ error: 'One or more instructor IDs are invalid' });
    }

    // Validate primary instructor ID if provided
    if (primary_instructor_id && !instructor_ids.includes(primary_instructor_id)) {
      return res.status(400).json({ error: 'Primary instructor must be in the instructor list' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const assignedInstructors = [];

      // Assign instructors
      for (const instructorId of instructor_ids) {
        const isPrimary = instructorId === primary_instructor_id ||
          (instructor_ids.length === 1) ||
          (!primary_instructor_id && instructorId === instructor_ids[0]);

        // Check if already assigned
        const existingAssignment = await client.query(`
          SELECT * FROM course_instructors 
          WHERE course_id = $1 AND instructor_id = $2
        `, [courseId, instructorId]);

        if (existingAssignment.rows.length > 0) {
          // Update existing assignment
          await client.query(`
            UPDATE course_instructors 
            SET is_active = true, is_primary = $1, assigned_by = $2, assigned_date = CURRENT_TIMESTAMP
            WHERE course_id = $3 AND instructor_id = $4
          `, [isPrimary, adminId, courseId, instructorId]);
        } else {
          // Create new assignment
          await client.query(`
            INSERT INTO course_instructors (
              course_id, instructor_id, assigned_by, is_primary
            ) VALUES ($1, $2, $3, $4)
          `, [courseId, instructorId, adminId, isPrimary]);
        }

        // Get instructor details
        const instructorDetails = instructorCheck.rows.find(i => i.id === instructorId);
        assignedInstructors.push({
          ...instructorDetails,
          is_primary: isPrimary,
          assigned_date: new Date()
        });
      }

      await client.query('COMMIT');

      res.json({
        message: 'Instructors assigned successfully',
        instructors: assignedInstructors
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Assign instructors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove instructor from course (Admin only)
router.delete('/courses/:courseId/instructors/:instructorId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { courseId, instructorId } = req.params;
    const adminId = req.user.id;

    // Check if assignment exists
    const assignmentCheck = await pool.query(`
      SELECT * FROM course_instructors 
      WHERE course_id = $1 AND instructor_id = $2 AND is_active = true
    `, [courseId, instructorId]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Instructor assignment not found' });
    }

    const assignment = assignmentCheck.rows[0];

    // Check if this is the only instructor
    const instructorCount = await pool.query(`
      SELECT COUNT(*) as count FROM course_instructors 
      WHERE course_id = $1 AND is_active = true
    `, [courseId]);

    if (parseInt(instructorCount.rows[0].count) === 1) {
      return res.status(400).json({ error: 'Cannot remove the only instructor from a course' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Remove instructor assignment
      await client.query(`
        UPDATE course_instructors 
        SET is_active = false, assigned_by = $1
        WHERE course_id = $2 AND instructor_id = $3
      `, [adminId, courseId, instructorId]);

      // If this was the primary instructor, assign primary to another instructor
      if (assignment.is_primary) {
        await client.query(`
          UPDATE course_instructors 
          SET is_primary = true 
          WHERE course_id = $1 AND is_active = true 
          ORDER BY assigned_date ASC 
          LIMIT 1
        `, [courseId]);
      }

      await client.query('COMMIT');

      res.json({ message: 'Instructor removed successfully' });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Remove instructor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get course analytics (Admin only)
router.get('/courses/:courseId/analytics', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { start_date, end_date } = req.query;

    // Check if course exists
    const courseCheck = await pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get enrollment statistics
    const enrollmentStats = await pool.query(`
      SELECT 
        COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
        COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completed_enrollments,
        COUNT(CASE WHEN e.status = 'dropped' THEN 1 END) as dropped_enrollments,
        COUNT(*) as total_enrollments
      FROM enrollments e
      WHERE e.course_id = $1
    `, [courseId]);

    // Get enrollment trends
    let dateFilter = '';
    let queryParams = [courseId];
    if (start_date && end_date) {
      dateFilter = 'AND e.enrollment_date BETWEEN $2 AND $3';
      queryParams.push(start_date, end_date);
    }

    const enrollmentTrends = await pool.query(`
      SELECT 
        DATE(e.enrollment_date) as date,
        COUNT(*) as enrollments,
        COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments
      FROM enrollments e
      WHERE e.course_id = $1 ${dateFilter}
      GROUP BY DATE(e.enrollment_date)
      ORDER BY date DESC
      LIMIT 30
    `, queryParams);

    // Get instructor assignment history
    const instructorHistory = await pool.query(`
      SELECT 
        ci.*,
        u.name as instructor_name,
        admin.name as assigned_by_name
      FROM course_instructors ci
      JOIN users u ON ci.instructor_id = u.id
      LEFT JOIN users admin ON ci.assigned_by = admin.id
      WHERE ci.course_id = $1
      ORDER BY ci.assigned_date DESC
      LIMIT 50
    `, [courseId]);

    // Get material upload statistics
    const materialStats = await pool.query(`
      SELECT 
        COUNT(*) as total_materials,
        COUNT(CASE WHEN cm.file_type = 'video' THEN 1 END) as video_count,
        COUNT(CASE WHEN cm.file_type = 'pdf' THEN 1 END) as pdf_count,
        COUNT(CASE WHEN cm.file_type = 'document' THEN 1 END) as document_count,
        SUM(cm.file_size) as total_size,
        AVG(cm.view_count) as avg_views,
        AVG(cm.download_count) as avg_downloads
      FROM course_materials cm
      WHERE cm.course_id = $1 AND cm.is_active = true
    `, [courseId]);

    res.json({
      course: courseCheck.rows[0],
      enrollment_stats: enrollmentStats.rows[0],
      enrollment_trends: enrollmentTrends.rows,
      instructor_history: instructorHistory.rows,
      material_stats: materialStats.rows[0]
    });

  } catch (error) {
    console.error('Get course analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available teachers for assignment
router.get('/available-teachers', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { search, exclude_course_id } = req.query;

    let whereConditions = ["u.role = 'teacher'"];
    let queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (exclude_course_id) {
      whereConditions.push(`NOT EXISTS (
        SELECT 1 FROM course_instructors ci 
        WHERE ci.instructor_id = u.id AND ci.course_id = $${paramIndex} AND ci.is_active = true
      )`);
      queryParams.push(exclude_course_id);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const teachersResult = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at,
        COUNT(ci.course_id) as assigned_courses_count,
        json_agg(
          json_build_object(
            'course_id', c.id,
            'course_title', c.title,
            'is_primary', ci.is_primary
          ) ORDER BY ci.assigned_date DESC
        ) FILTER (WHERE ci.is_active = true) as current_assignments
      FROM users u
      LEFT JOIN course_instructors ci ON u.id = ci.instructor_id AND ci.is_active = true
      LEFT JOIN courses c ON ci.course_id = c.id AND c.is_active = true
      WHERE ${whereClause}
      GROUP BY u.id, u.name, u.email, u.created_at
      ORDER BY u.name
    `, queryParams);

    res.json({
      teachers: teachersResult.rows
    });

  } catch (error) {
    console.error('Get available teachers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get course statistics
router.get('/course-stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_courses,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_courses,
        COUNT(CASE WHEN is_active = false THEN 1 END) as archived_courses,
        AVG(max_students) as avg_capacity,
        SUM(
          (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active')
        ) as total_active_enrollments
      FROM courses c
    `);

    res.json({
      stats: statsResult.rows[0]
    });

  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;