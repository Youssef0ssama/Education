import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get student's enrolled courses with detailed information
router.get('/courses', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { status = 'active' } = req.query;

    const coursesResult = await pool.query(`
      SELECT 
        c.id, c.title, c.description, c.price, c.duration_weeks,
        u.name as instructor_name, u.email as instructor_email,
        e.enrollment_date, e.progress_percentage, e.status, e.final_grade,
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) as attended_sessions,
        COUNT(DISTINCT ass.id) as total_assignments,
        COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN s.id END) as submitted_assignments,
        COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_assignments,
        AVG(CASE WHEN s.grade IS NOT NULL THEN (s.grade / ass.max_points) * 100 END) as avg_grade_percentage
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN class_sessions cs ON c.id = cs.course_id
      LEFT JOIN attendance a ON cs.id = a.session_id AND a.student_id = e.student_id
      LEFT JOIN assignments ass ON ass.course_id = c.id
      LEFT JOIN submissions s ON ass.id = s.assignment_id AND s.student_id = e.student_id
      WHERE e.student_id = $1 AND e.status = $2
      GROUP BY c.id, c.title, c.description, c.price, c.duration_weeks, u.name, u.email, e.enrollment_date, e.progress_percentage, e.status, e.final_grade
      ORDER BY e.enrollment_date DESC
    `, [studentId, status]);

    res.json({ courses: coursesResult.rows });
  } catch (error) {
    console.error('Get student courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available courses for enrollment
router.get('/available-courses', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { search, instructor_id, price_max } = req.query;

    let whereConditions = ['c.is_active = true'];
    let queryParams = [studentId];
    let paramIndex = 2;

    // Exclude already enrolled courses
    whereConditions.push(`NOT EXISTS (
      SELECT 1 FROM enrollments e 
      WHERE e.course_id = c.id AND e.student_id = $1 AND e.status IN ('active', 'completed')
    )`);

    if (search) {
      whereConditions.push(`(c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (instructor_id) {
      whereConditions.push(`c.instructor_id = $${paramIndex}`);
      queryParams.push(instructor_id);
      paramIndex++;
    }

    if (price_max) {
      whereConditions.push(`c.price <= $${paramIndex}`);
      queryParams.push(price_max);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const coursesResult = await pool.query(`
      SELECT 
        c.id, c.title, c.description, c.price, c.duration_weeks, c.max_students,
        u.name as instructor_name, u.email as instructor_email,
        COUNT(e.id) as enrolled_students,
        (c.max_students - COUNT(e.id)) as available_spots
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      WHERE ${whereClause}
      GROUP BY c.id, c.title, c.description, c.price, c.duration_weeks, c.max_students, u.name, u.email
      HAVING COUNT(e.id) < c.max_students
      ORDER BY c.created_at DESC
    `, queryParams);

    res.json({ courses: coursesResult.rows });
  } catch (error) {
    console.error('Get available courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enroll in a course
router.post('/enroll/:courseId', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    // Check if course exists and is active
    const courseResult = await pool.query(
      'SELECT id, title, max_students FROM courses WHERE id = $1 AND is_active = true',
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or inactive' });
    }

    const course = courseResult.rows[0];

    // Check if already enrolled
    const existingEnrollment = await pool.query(
      'SELECT id, status FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );

    if (existingEnrollment.rows.length > 0) {
      const enrollment = existingEnrollment.rows[0];
      if (enrollment.status === 'active') {
        return res.status(409).json({ error: 'Already enrolled in this course' });
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
      RETURNING id, enrollment_date, status, progress_percentage
    `, [studentId, courseId, 'active', 0]);

    res.status(201).json({
      message: 'Successfully enrolled in course',
      enrollment: enrollmentResult.rows[0],
      course: { id: course.id, title: course.title }
    });
  } catch (error) {
    console.error('Course enrollment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student's assignments
router.get('/assignments', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { course_id, status, due_date_filter } = req.query;

    let whereConditions = [`e.student_id = $1 AND e.status = 'active'`];
    let queryParams = [studentId];
    let paramIndex = 2;

    if (course_id) {
      whereConditions.push(`c.id = $${paramIndex}`);
      queryParams.push(course_id);
      paramIndex++;
    }

    // Filter by submission status
    if (status === 'submitted') {
      whereConditions.push(`s.id IS NOT NULL`);
    } else if (status === 'not_submitted') {
      whereConditions.push(`s.id IS NULL`);
    } else if (status === 'graded') {
      whereConditions.push(`s.grade IS NOT NULL`);
    } else if (status === 'overdue') {
      whereConditions.push(`ass.due_date < NOW() AND s.id IS NULL`);
    }

    // Filter by due date
    if (due_date_filter === 'upcoming') {
      whereConditions.push(`ass.due_date > NOW() AND ass.due_date <= NOW() + INTERVAL '7 days'`);
    } else if (due_date_filter === 'overdue') {
      whereConditions.push(`ass.due_date < NOW() AND s.id IS NULL`);
    }

    const whereClause = whereConditions.join(' AND ');

    const assignmentsResult = await pool.query(`
      SELECT 
        ass.id, ass.title, ass.description, ass.due_date, ass.max_points, ass.assignment_type, ass.created_at,
        c.title as course_title, c.id as course_id,
        instructor.name as instructor_name,
        s.id as submission_id, s.submission_text, s.file_url, s.submitted_at, s.grade, s.feedback, s.graded_at,
        CASE 
          WHEN s.id IS NULL THEN 'not_submitted'
          WHEN s.grade IS NOT NULL THEN 'graded'
          ELSE 'submitted'
        END as submission_status,
        CASE 
          WHEN ass.due_date IS NULL THEN false
          WHEN ass.due_date < NOW() AND s.id IS NULL THEN true
          ELSE false
        END as is_overdue
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users instructor ON c.instructor_id = instructor.id
      JOIN assignments ass ON c.id = ass.course_id
      LEFT JOIN submissions s ON ass.id = s.assignment_id AND s.student_id = e.student_id
      WHERE ${whereClause}
      ORDER BY 
        CASE WHEN ass.due_date IS NULL THEN 1 ELSE 0 END,
        ass.due_date ASC,
        ass.created_at DESC
    `, queryParams);

    res.json({ assignments: assignmentsResult.rows });
  } catch (error) {
    console.error('Get student assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit assignment
router.post('/assignments/:assignmentId/submit', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { submission_text, file_url } = req.body;
    const studentId = req.user.id;

    // Check if assignment exists and student is enrolled
    const assignmentResult = await pool.query(`
      SELECT a.id, a.title, a.due_date, c.id as course_id
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN enrollments e ON c.id = e.course_id
      WHERE a.id = $1 AND e.student_id = $2 AND e.status = 'active'
    `, [assignmentId, studentId]);

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found or you are not enrolled in this course' });
    }

    const assignment = assignmentResult.rows[0];

    // Check if assignment is past due (optional warning)
    const isPastDue = assignment.due_date && new Date(assignment.due_date) < new Date();

    // Check if student has already submitted
    const existingSubmission = await pool.query(
      'SELECT id FROM submissions WHERE assignment_id = $1 AND student_id = $2',
      [assignmentId, studentId]
    );

    if (existingSubmission.rows.length > 0) {
      // Update existing submission
      const result = await pool.query(`
        UPDATE submissions 
        SET submission_text = $1, file_url = $2, submitted_at = CURRENT_TIMESTAMP 
        WHERE assignment_id = $3 AND student_id = $4
        RETURNING id, submission_text, file_url, submitted_at
      `, [submission_text, file_url, assignmentId, studentId]);

      res.json({
        message: 'Assignment submission updated successfully',
        submission: result.rows[0],
        isPastDue
      });
    } else {
      // Create new submission
      const result = await pool.query(`
        INSERT INTO submissions (assignment_id, student_id, submission_text, file_url, submitted_at) 
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
        RETURNING id, submission_text, file_url, submitted_at
      `, [assignmentId, studentId, submission_text, file_url]);

      res.status(201).json({
        message: 'Assignment submitted successfully',
        submission: result.rows[0],
        isPastDue
      });
    }
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student's schedule
router.get('/schedule', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { start_date, end_date, date_from, date_to, course_id } = req.query;

    let whereConditions = [`e.student_id = $1 AND e.status = 'active'`];
    let queryParams = [studentId];
    let paramIndex = 2;

    if (course_id) {
      whereConditions.push(`c.id = $${paramIndex}`);
      queryParams.push(course_id);
      paramIndex++;
    }

    if (date_from) {
      whereConditions.push(`cs.scheduled_start >= $${paramIndex}`);
      queryParams.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      whereConditions.push(`cs.scheduled_start <= $${paramIndex}`);
      queryParams.push(date_to);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const sessionsResult = await pool.query(`
      SELECT 
        cs.id, cs.title, cs.description, cs.scheduled_start, cs.scheduled_end, 
        cs.zoom_meeting_id, cs.zoom_join_url, cs.zoom_password, cs.status,
        c.title as course_title, c.id as course_id,
        instructor.name as instructor_name,
        a.status as attendance_status, a.join_time, a.leave_time, a.notes
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users instructor ON c.instructor_id = instructor.id
      JOIN class_sessions cs ON c.id = cs.course_id
      LEFT JOIN attendance a ON cs.id = a.session_id AND a.student_id = e.student_id
      WHERE ${whereClause}
      ORDER BY cs.scheduled_start ASC
    `, queryParams);

    // Transform sessions to match frontend expectations
    const schedule = sessionsResult.rows.map(session => ({
      ...session,
      start_time: session.scheduled_start,
      end_time: session.scheduled_end,
      type: 'lecture',
      location: null
    }));

    res.json({ schedule });
  } catch (error) {
    console.error('Get student schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student's grades
router.get('/grades', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { course_id, assignment_type } = req.query;

    let whereConditions = [`s.student_id = $1 AND s.grade IS NOT NULL`];
    let queryParams = [studentId];
    let paramIndex = 2;

    if (course_id) {
      whereConditions.push(`c.id = $${paramIndex}`);
      queryParams.push(course_id);
      paramIndex++;
    }

    if (assignment_type) {
      whereConditions.push(`a.assignment_type = $${paramIndex}`);
      queryParams.push(assignment_type);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const gradesResult = await pool.query(`
      SELECT 
        s.id, s.grade, s.feedback, s.graded_at, s.submitted_at,
        a.title as assignment_title, a.max_points, a.assignment_type, a.due_date,
        c.title as course_title, c.id as course_id,
        grader.name as graded_by_name,
        (s.grade / a.max_points) * 100 as percentage
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN users grader ON s.graded_by = grader.id
      WHERE ${whereClause}
      ORDER BY s.graded_at DESC
    `, queryParams);

    // Calculate grade statistics
    const statsResult = await pool.query(`
      SELECT 
        c.id as course_id, c.title as course_title,
        COUNT(DISTINCT a.id) as total_assignments,
        COUNT(s.id) as graded_assignments,
        AVG(s.grade / a.max_points * 100) as average_grade,
        MIN(s.grade / a.max_points * 100) as min_percentage,
        MAX(s.grade / a.max_points * 100) as max_percentage
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN assignments a ON c.id = a.course_id
      LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = e.student_id AND s.grade IS NOT NULL
      WHERE e.student_id = $1 AND e.status = 'active'
      GROUP BY c.id, c.title
      ORDER BY c.title
    `, [studentId]);

    res.json({ 
      grades: gradesResult.rows,
      statistics: statsResult.rows
    });
  } catch (error) {
    console.error('Get student grades error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student's attendance record
router.get('/attendance', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { course_id, date_from, date_to } = req.query;

    let whereConditions = [`a.student_id = $1`];
    let queryParams = [studentId];
    let paramIndex = 2;

    if (course_id) {
      whereConditions.push(`c.id = $${paramIndex}`);
      queryParams.push(course_id);
      paramIndex++;
    }

    if (date_from) {
      whereConditions.push(`cs.scheduled_start >= $${paramIndex}`);
      queryParams.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      whereConditions.push(`cs.scheduled_start <= $${paramIndex}`);
      queryParams.push(date_to);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const attendanceResult = await pool.query(`
      SELECT 
        a.id, a.status, a.join_time, a.leave_time, a.notes,
        cs.title as session_title, cs.scheduled_start, cs.scheduled_end,
        c.title as course_title, c.id as course_id,
        instructor.name as instructor_name
      FROM attendance a
      JOIN class_sessions cs ON a.session_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      JOIN users instructor ON c.instructor_id = instructor.id
      WHERE ${whereClause}
      ORDER BY cs.scheduled_start DESC
    `, queryParams);

    // Calculate attendance statistics
    const statsResult = await pool.query(`
      SELECT 
        c.id as course_id, c.title as course_title,
        COUNT(a.id) as total_sessions,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count,
        ROUND((COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / COUNT(a.id)), 2) as attendance_percentage
      FROM attendance a
      JOIN class_sessions cs ON a.session_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      JOIN enrollments e ON c.id = e.course_id
      WHERE a.student_id = $1 AND e.student_id = $1 AND e.status = 'active'
      GROUP BY c.id, c.title
      ORDER BY c.title
    `, [studentId]);

    res.json({ 
      attendance: attendanceResult.rows,
      statistics: statsResult.rows
    });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student's notifications
router.get('/notifications', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { is_read, limit = 20 } = req.query;

    let whereConditions = [`user_id = $1`];
    let queryParams = [studentId];
    let paramIndex = 2;

    if (is_read !== undefined) {
      whereConditions.push(`is_read = $${paramIndex}`);
      queryParams.push(is_read === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const notificationsResult = await pool.query(`
      SELECT id, title, content, notification_type, is_read, action_url, created_at
      FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `, [...queryParams, limit]);

    res.json({ notifications: notificationsResult.rows });
  } catch (error) {
    console.error('Get student notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;