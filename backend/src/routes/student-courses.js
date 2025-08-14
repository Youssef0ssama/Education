import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Browse all available courses for enrollment
router.get('/available-courses', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { 
      search, 
      difficulty_level, 
      min_price, 
      max_price, 
      has_spots = true,
      sort_by = 'title',
      sort_order = 'asc',
      page = 1, 
      limit = 20 
    } = req.query;

    let whereConditions = [
      "c.status = 'active'",
      "c.is_active = true",
      // Exclude courses already enrolled in
      `NOT EXISTS (
        SELECT 1 FROM enrollments e 
        WHERE e.course_id = c.id AND e.student_id = $1 
        AND e.status IN ('active', 'completed')
      )`
    ];
    let queryParams = [studentId];
    let paramIndex = 2;

    // Search filter
    if (search) {
      whereConditions.push(`(c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Difficulty filter
    if (difficulty_level) {
      whereConditions.push(`c.difficulty_level = $${paramIndex}`);
      queryParams.push(difficulty_level);
      paramIndex++;
    }

    // Price filters
    if (min_price) {
      whereConditions.push(`c.price >= $${paramIndex}`);
      queryParams.push(parseFloat(min_price));
      paramIndex++;
    }

    if (max_price) {
      whereConditions.push(`c.price <= $${paramIndex}`);
      queryParams.push(parseFloat(max_price));
      paramIndex++;
    }

    // Available spots filter
    if (has_spots === 'true') {
      whereConditions.push(`c.max_students > (
        SELECT COUNT(*) FROM enrollments e 
        WHERE e.course_id = c.id AND e.status = 'active'
      )`);
    }

    // Check enrollment period
    whereConditions.push(`(
      c.enrollment_start_date IS NULL OR c.enrollment_start_date <= NOW()
    )`);
    whereConditions.push(`(
      c.enrollment_end_date IS NULL OR c.enrollment_end_date >= NOW()
    )`);

    const whereClause = whereConditions.join(' AND ');

    // Validate sort parameters
    const validSortColumns = ['title', 'price', 'created_at', 'difficulty_level', 'active_enrollments'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'title';
    const sortDirection = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const offset = (page - 1) * limit;

    const coursesResult = await pool.query(`
      SELECT 
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email,
              'is_primary', ci.is_primary
            ) ORDER BY ci.is_primary DESC, ci.assigned_date ASC
          ) FILTER (WHERE ci.is_active = true), 
          '[]'::json
        ) as instructors,
        COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
        c.max_students - COUNT(CASE WHEN e.status = 'active' THEN 1 END) as available_spots,
        COUNT(cw.student_id) as waitlist_count,
        CASE 
          WHEN c.max_students > 0 THEN 
            ROUND((COUNT(CASE WHEN e.status = 'active' THEN 1 END) * 100.0 / c.max_students), 2)
          ELSE 0
        END as enrollment_percentage,
        -- Check if student meets prerequisites
        check_course_prerequisites($1, c.id) as meets_prerequisites,
        -- Check if student is on waitlist
        EXISTS(
          SELECT 1 FROM course_waitlist cw2 
          WHERE cw2.course_id = c.id AND cw2.student_id = $1 AND cw2.is_active = true
        ) as on_waitlist
      FROM courses c
      LEFT JOIN course_instructors ci ON c.id = ci.course_id AND ci.is_active = true
      LEFT JOIN users u ON ci.instructor_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN course_waitlist cw ON c.id = cw.course_id AND cw.is_active = true
      WHERE ${whereClause}
      GROUP BY c.id
      ORDER BY ${sortColumn === 'active_enrollments' ? 'COUNT(CASE WHEN e.status = \'active\' THEN 1 END)' : 'c.' + sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, parseInt(limit), offset]);

    // Get total count for pagination
    const countResult = await pool.query(`
      SELECT COUNT(DISTINCT c.id) as total
      FROM courses c
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
    console.error('Get available courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed course information
router.get('/courses/:courseId', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const courseResult = await pool.query(`
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
        ) as instructors,
        COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
        COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completed_enrollments,
        c.max_students - COUNT(CASE WHEN e.status = 'active' THEN 1 END) as available_spots,
        COUNT(cw.student_id) as waitlist_count,
        CASE 
          WHEN c.max_students > 0 THEN 
            ROUND((COUNT(CASE WHEN e.status = 'active' THEN 1 END) * 100.0 / c.max_students), 2)
          ELSE 0
        END as enrollment_percentage,
        -- Check student's relationship with this course
        (SELECT status FROM enrollments WHERE course_id = c.id AND student_id = $2) as enrollment_status,
        (SELECT position FROM course_waitlist WHERE course_id = c.id AND student_id = $2 AND is_active = true) as waitlist_position,
        check_course_prerequisites($2, c.id) as meets_prerequisites
      FROM courses c
      LEFT JOIN course_instructors ci ON c.id = ci.course_id AND ci.is_active = true
      LEFT JOIN users u ON ci.instructor_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN course_waitlist cw ON c.id = cw.course_id AND cw.is_active = true
      WHERE c.id = $1
      GROUP BY c.id
    `, [courseId, studentId]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];

    // Get prerequisite course details if any
    let prerequisiteCourses = [];
    if (course.prerequisites && course.prerequisites.length > 0) {
      const prereqResult = await pool.query(`
        SELECT id, title, status
        FROM courses
        WHERE id = ANY($1)
      `, [course.prerequisites]);
      prerequisiteCourses = prereqResult.rows;
    }

    // Get course materials count (public materials only)
    const materialsCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM course_materials cm
      WHERE cm.course_id = $1 AND cm.is_active = true AND cm.visibility = 'public'
    `, [courseId]);

    // Get assignments count
    const assignmentsCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM assignments a
      WHERE a.course_id = $1
    `, [courseId]);

    res.json({
      course: {
        ...course,
        prerequisite_courses: prerequisiteCourses,
        materials_count: parseInt(materialsCount.rows[0].count),
        assignments_count: parseInt(assignmentsCount.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Get course details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enroll in a course
router.post('/courses/:courseId/enroll', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    console.log('=== ENROLLMENT DEBUG ===');
    console.log('Course ID:', req.params.courseId);
    console.log('Student ID:', req.user.id);
    
    const { courseId } = req.params;
    const studentId = req.user.id;

    // Check if course exists and is available for enrollment
    console.log('Checking course availability...');
    const courseResult = await pool.query(`
      SELECT 
        c.*,
        COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.id = $1 AND c.status = 'active' AND c.is_active = true
      GROUP BY c.id
    `, [courseId]);
    
    console.log('Course query result:', courseResult.rows.length, 'courses found');

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or not available for enrollment' });
    }

    const course = courseResult.rows[0];
    const activeEnrollments = parseInt(course.active_enrollments);

    // Check enrollment period
    const now = new Date();
    if (course.enrollment_start_date && new Date(course.enrollment_start_date) > now) {
      return res.status(400).json({ 
        error: 'Enrollment has not started yet',
        enrollment_start_date: course.enrollment_start_date
      });
    }

    if (course.enrollment_end_date && new Date(course.enrollment_end_date) < now) {
      return res.status(400).json({ 
        error: 'Enrollment period has ended',
        enrollment_end_date: course.enrollment_end_date
      });
    }

    // Check if already enrolled or on waitlist
    const existingEnrollment = await pool.query(`
      SELECT status FROM enrollments 
      WHERE course_id = $1 AND student_id = $2
    `, [courseId, studentId]);

    if (existingEnrollment.rows.length > 0) {
      const status = existingEnrollment.rows[0].status;
      if (status === 'active') {
        return res.status(409).json({ error: 'Already enrolled in this course' });
      } else if (status === 'completed') {
        return res.status(409).json({ error: 'You have already completed this course' });
      } else if (status === 'dropped') {
        // Allow re-enrollment if previously dropped
      }
    }

    const existingWaitlist = await pool.query(`
      SELECT position FROM course_waitlist 
      WHERE course_id = $1 AND student_id = $2 AND is_active = true
    `, [courseId, studentId]);

    if (existingWaitlist.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Already on waitlist for this course',
        waitlist_position: existingWaitlist.rows[0].position
      });
    }

    // Check prerequisites
    const meetsPrerequisites = await pool.query(`
      SELECT check_course_prerequisites($1, $2) as meets_prerequisites
    `, [studentId, courseId]);

    if (!meetsPrerequisites.rows[0].meets_prerequisites) {
      return res.status(400).json({ 
        error: 'Prerequisites not met',
        prerequisites: course.prerequisites
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if course is full
      if (activeEnrollments >= course.max_students) {
        // Add to waitlist
        const position = await client.query(`
          SELECT get_next_waitlist_position($1) as position
        `, [courseId]);

        await client.query(`
          INSERT INTO course_waitlist (course_id, student_id, position)
          VALUES ($1, $2, $3)
          ON CONFLICT (course_id, student_id) 
          DO UPDATE SET is_active = true, position = $3, joined_date = CURRENT_TIMESTAMP
        `, [courseId, studentId, position.rows[0].position]);

        await client.query('COMMIT');

        res.json({
          message: 'Course is full. You have been added to the waitlist.',
          waitlist_position: position.rows[0].position,
          enrolled: false,
          waitlisted: true
        });
      } else {
        // Enroll directly
        let enrollmentId;
        
        if (existingEnrollment.rows.length > 0) {
          // Update existing enrollment
          const updateResult = await client.query(`
            UPDATE enrollments 
            SET status = 'active', enrollment_date = CURRENT_TIMESTAMP, progress_percentage = 0
            WHERE course_id = $1 AND student_id = $2
            RETURNING id
          `, [courseId, studentId]);
          enrollmentId = updateResult.rows[0].id;
        } else {
          // Create new enrollment
          const insertResult = await client.query(`
            INSERT INTO enrollments (student_id, course_id, enrollment_date, status, progress_percentage)
            VALUES ($1, $2, CURRENT_TIMESTAMP, 'active', 0)
            RETURNING id
          `, [studentId, courseId]);
          enrollmentId = insertResult.rows[0].id;
        }

        await client.query('COMMIT');

        res.json({
          message: 'Successfully enrolled in course',
          enrollment_id: enrollmentId,
          enrolled: true,
          waitlisted: false
        });
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('=== ENROLLMENT ERROR ===');
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Drop from course
router.post('/courses/:courseId/drop', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;
    const { reason } = req.body;

    // Check if enrolled
    const enrollmentResult = await pool.query(`
      SELECT * FROM enrollments 
      WHERE course_id = $1 AND student_id = $2 AND status = 'active'
    `, [courseId, studentId]);

    if (enrollmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not enrolled in this course' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update enrollment status
      await client.query(`
        UPDATE enrollments 
        SET status = 'dropped', updated_at = CURRENT_TIMESTAMP
        WHERE course_id = $1 AND student_id = $2
      `, [courseId, studentId]);

      // Log the drop
      await client.query(`
        INSERT INTO enrollment_audit_log (
          course_id, student_id, action, old_status, new_status, 
          performed_at, reason
        ) VALUES ($1, $2, 'dropped', 'active', 'dropped', CURRENT_TIMESTAMP, $3)
      `, [courseId, studentId, reason]);

      // Promote someone from waitlist if available
      const promotedStudent = await client.query(`
        SELECT promote_from_waitlist($1) as promoted_student_id
      `, [courseId]);

      await client.query('COMMIT');

      res.json({
        message: 'Successfully dropped from course',
        promoted_student: promotedStudent.rows[0].promoted_student_id
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Course drop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get enrolled courses
router.get('/enrolled-courses', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { status = 'active' } = req.query;

    let whereConditions = ['e.student_id = $1'];
    let queryParams = [studentId];
    let paramIndex = 2;

    if (status && status !== 'all') {
      whereConditions.push(`e.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const coursesResult = await pool.query(`
      SELECT 
        c.*,
        e.enrollment_date,
        e.status as enrollment_status,
        e.progress_percentage,
        e.final_grade,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email,
              'is_primary', ci.is_primary
            ) ORDER BY ci.is_primary DESC, ci.assigned_date ASC
          ) FILTER (WHERE ci.is_active = true), 
          '[]'::json
        ) as instructors,
        COUNT(DISTINCT cm.id) FILTER (WHERE cm.is_active = true AND (
          cm.visibility = 'public' OR 
          (cm.visibility = 'scheduled' AND cm.scheduled_date <= NOW())
        )) as available_materials,
        COUNT(DISTINCT a.id) as total_assignments,
        COUNT(DISTINCT s.id) as submitted_assignments,
        COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_assignments,
        AVG(CASE WHEN s.grade IS NOT NULL THEN (s.grade / a.max_points) * 100 END) as avg_grade_percentage,
        -- Next upcoming session
        (
          SELECT json_build_object(
            'id', cs.id,
            'title', cs.title,
            'scheduled_start', cs.scheduled_start,
            'scheduled_end', cs.scheduled_end
          )
          FROM class_sessions cs
          WHERE cs.course_id = c.id AND cs.scheduled_start > NOW()
          ORDER BY cs.scheduled_start ASC
          LIMIT 1
        ) as next_session
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN course_instructors ci ON c.id = ci.course_id AND ci.is_active = true
      LEFT JOIN users u ON ci.instructor_id = u.id
      LEFT JOIN course_materials cm ON c.id = cm.course_id
      LEFT JOIN assignments a ON c.id = a.course_id
      LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = e.student_id
      WHERE ${whereClause}
      GROUP BY c.id, e.enrollment_date, e.status, e.progress_percentage, e.final_grade
      ORDER BY e.enrollment_date DESC
    `, queryParams);

    res.json({
      courses: coursesResult.rows,
      total: coursesResult.rows.length
    });

  } catch (error) {
    console.error('Get enrolled courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get waitlist status
router.get('/waitlist', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;

    const waitlistResult = await pool.query(`
      SELECT 
        cw.*,
        c.title as course_title,
        c.max_students,
        COUNT(e.id) FILTER (WHERE e.status = 'active') as current_enrollments,
        c.max_students - COUNT(e.id) FILTER (WHERE e.status = 'active') as spots_needed
      FROM course_waitlist cw
      JOIN courses c ON cw.course_id = c.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE cw.student_id = $1 AND cw.is_active = true
      GROUP BY cw.id, c.title, c.max_students
      ORDER BY cw.joined_date ASC
    `, [studentId]);

    res.json({
      waitlist_entries: waitlistResult.rows,
      total: waitlistResult.rows.length
    });

  } catch (error) {
    console.error('Get waitlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove from waitlist
router.delete('/waitlist/:courseId', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const result = await pool.query(`
      UPDATE course_waitlist 
      SET is_active = false 
      WHERE course_id = $1 AND student_id = $2 AND is_active = true
      RETURNING *
    `, [courseId, studentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found on waitlist for this course' });
    }

    res.json({ message: 'Removed from waitlist successfully' });

  } catch (error) {
    console.error('Remove from waitlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;