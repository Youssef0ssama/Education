import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get parent's children with detailed information
router.get('/children', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;

    const childrenResult = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.date_of_birth, u.profile_image_url,
        psr.relationship_type,
        COUNT(DISTINCT e.id) as enrolled_courses,
        AVG(e.progress_percentage) as avg_progress,
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) as attended_sessions,
        COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_assignments,
        COUNT(DISTINCT s.id) as total_assignments,
        AVG(CASE WHEN s.grade IS NOT NULL THEN (s.grade / ass.max_points) * 100 END) as avg_grade_percentage
      FROM parent_student_relationships psr
      JOIN users u ON psr.student_id = u.id
      LEFT JOIN enrollments e ON u.id = e.student_id AND e.status = 'active'
      LEFT JOIN courses c ON e.course_id = c.id
      LEFT JOIN class_sessions cs ON c.id = cs.course_id
      LEFT JOIN attendance a ON cs.id = a.session_id AND a.student_id = u.id
      LEFT JOIN submissions s ON s.student_id = u.id
      LEFT JOIN assignments ass ON s.assignment_id = ass.id
      WHERE psr.parent_id = $1
      GROUP BY u.id, u.name, u.email, u.phone, u.date_of_birth, u.profile_image_url, psr.relationship_type
      ORDER BY u.name
    `, [parentId]);

    res.json({ children: childrenResult.rows });
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed progress for a specific child
router.get('/children/:childId/progress', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.id;

    // Verify parent-child relationship
    const relationshipResult = await pool.query(
      'SELECT id FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2',
      [parentId, childId]
    );

    if (relationshipResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get course progress
    const coursesResult = await pool.query(`
      SELECT 
        c.id, c.title, c.description, c.duration_weeks,
        u.name as instructor_name, u.email as instructor_email,
        e.enrollment_date, e.progress_percentage, e.status,
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) as attended_sessions,
        COUNT(DISTINCT ass.id) as total_assignments,
        COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_assignments,
        AVG(CASE WHEN s.grade IS NOT NULL THEN (s.grade / ass.max_points) * 100 END) as avg_grade_percentage
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN class_sessions cs ON c.id = cs.course_id
      LEFT JOIN attendance a ON cs.id = a.session_id AND a.student_id = e.student_id
      LEFT JOIN assignments ass ON ass.course_id = c.id
      LEFT JOIN submissions s ON ass.id = s.assignment_id AND s.student_id = e.student_id
      WHERE e.student_id = $1 AND e.status = 'active'
      GROUP BY c.id, c.title, c.description, c.duration_weeks, u.name, u.email, e.enrollment_date, e.progress_percentage, e.status
      ORDER BY e.enrollment_date DESC
    `, [childId]);

    // Get recent grades
    const gradesResult = await pool.query(`
      SELECT 
        s.id, s.grade, s.feedback, s.graded_at,
        ass.title as assignment_title, ass.max_points, ass.assignment_type,
        c.title as course_title,
        grader.name as graded_by_name
      FROM submissions s
      JOIN assignments ass ON s.assignment_id = ass.id
      JOIN courses c ON ass.course_id = c.id
      LEFT JOIN users grader ON s.graded_by = grader.id
      WHERE s.student_id = $1 AND s.grade IS NOT NULL
      ORDER BY s.graded_at DESC
      LIMIT 20
    `, [childId]);

    // Get attendance summary
    const attendanceResult = await pool.query(`
      SELECT 
        a.status,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM attendance WHERE student_id = $1)), 2) as percentage
      FROM attendance a
      WHERE a.student_id = $1
      GROUP BY a.status
    `, [childId]);

    res.json({
      courses: coursesResult.rows,
      recentGrades: gradesResult.rows,
      attendanceSummary: attendanceResult.rows
    });
  } catch (error) {
    console.error('Get child progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get upcoming sessions for parent's children
router.get('/schedule', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;
    const { date_from, date_to, child_id } = req.query;

    let whereConditions = [`psr.parent_id = $1`];
    let queryParams = [parentId];
    let paramIndex = 2;

    if (child_id) {
      whereConditions.push(`u.id = $${paramIndex}`);
      queryParams.push(child_id);
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
        cs.id, cs.title, cs.description, cs.scheduled_start, cs.scheduled_end, cs.status,
        c.title as course_title, c.id as course_id,
        u.name as student_name, u.id as student_id,
        instructor.name as instructor_name,
        a.status as attendance_status
      FROM parent_student_relationships psr
      JOIN users u ON psr.student_id = u.id
      JOIN enrollments e ON u.id = e.student_id AND e.status = 'active'
      JOIN courses c ON e.course_id = c.id
      JOIN class_sessions cs ON c.id = cs.course_id
      JOIN users instructor ON c.instructor_id = instructor.id
      LEFT JOIN attendance a ON cs.id = a.session_id AND a.student_id = u.id
      WHERE ${whereClause}
      ORDER BY cs.scheduled_start ASC
    `, queryParams);

    res.json({ sessions: sessionsResult.rows });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get assignments for parent's children
router.get('/assignments', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;
    const { child_id, status, course_id } = req.query;

    let whereConditions = [`psr.parent_id = $1`];
    let queryParams = [parentId];
    let paramIndex = 2;

    if (child_id) {
      whereConditions.push(`u.id = $${paramIndex}`);
      queryParams.push(child_id);
      paramIndex++;
    }

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

    const whereClause = whereConditions.join(' AND ');

    const assignmentsResult = await pool.query(`
      SELECT 
        ass.id, ass.title, ass.description, ass.due_date, ass.max_points, ass.assignment_type, ass.created_at,
        c.title as course_title, c.id as course_id,
        u.name as student_name, u.id as student_id,
        instructor.name as instructor_name,
        s.id as submission_id, s.submitted_at, s.grade, s.feedback, s.graded_at,
        CASE 
          WHEN s.id IS NULL THEN 'not_submitted'
          WHEN s.grade IS NOT NULL THEN 'graded'
          ELSE 'submitted'
        END as submission_status
      FROM parent_student_relationships psr
      JOIN users u ON psr.student_id = u.id
      JOIN enrollments e ON u.id = e.student_id AND e.status = 'active'
      JOIN courses c ON e.course_id = c.id
      JOIN users instructor ON c.instructor_id = instructor.id
      JOIN assignments ass ON c.id = ass.course_id
      LEFT JOIN submissions s ON ass.id = s.assignment_id AND s.student_id = u.id
      WHERE ${whereClause}
      ORDER BY ass.due_date DESC, ass.created_at DESC
    `, queryParams);

    res.json({ assignments: assignmentsResult.rows });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get communication history (messages between parent and teachers)
router.get('/messages', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;
    const { child_id, teacher_id } = req.query;

    let whereConditions = [`(
      (m.sender_id = $1 AND recipient.role = 'teacher') OR 
      (m.recipient_id = $1 AND sender.role = 'teacher')
    )`];
    let queryParams = [parentId];
    let paramIndex = 2;

    if (teacher_id) {
      whereConditions.push(`(m.sender_id = $${paramIndex} OR m.recipient_id = $${paramIndex})`);
      queryParams.push(teacher_id);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const messagesResult = await pool.query(`
      SELECT 
        m.id, m.subject, m.content, m.is_read, m.message_type, m.created_at,
        sender.name as sender_name, sender.role as sender_role, sender.id as sender_id,
        recipient.name as recipient_name, recipient.role as recipient_role, recipient.id as recipient_id
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users recipient ON m.recipient_id = recipient.id
      WHERE ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT 50
    `, queryParams);

    res.json({ messages: messagesResult.rows });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message to teacher
router.post('/messages', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;
    const { recipient_id, subject, content, child_id } = req.body;

    // Validation
    if (!recipient_id || !subject || !content) {
      return res.status(400).json({ error: 'Recipient, subject, and content are required' });
    }

    // Verify recipient is a teacher
    const teacherResult = await pool.query(
      'SELECT id, name FROM users WHERE id = $1 AND role = $2 AND is_active = true',
      [recipient_id, 'teacher']
    );

    if (teacherResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid teacher recipient' });
    }

    // If child_id is provided, verify parent-child relationship
    if (child_id) {
      const relationshipResult = await pool.query(
        'SELECT id FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2',
        [parentId, child_id]
      );

      if (relationshipResult.rows.length === 0) {
        return res.status(403).json({ error: 'Invalid child reference' });
      }
    }

    // Create message
    const result = await pool.query(`
      INSERT INTO messages (sender_id, recipient_id, subject, content, message_type) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id, subject, content, created_at
    `, [parentId, recipient_id, subject, content, 'direct']);

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: result.rows[0]
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notifications for parent
router.get('/notifications', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;
    const { is_read, limit = 20 } = req.query;

    let whereConditions = [`user_id = $1`];
    let queryParams = [parentId];
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
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const { id } = req.params;
    const parentId = req.user.id;

    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, parentId]
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

// Get teachers for parent's children
router.get('/teachers', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;

    const teachersResult = await pool.query(`
      SELECT DISTINCT
        u.id, u.name, u.email, u.phone,
        array_agg(DISTINCT c.title) as courses,
        array_agg(DISTINCT student.name) as students
      FROM parent_student_relationships psr
      JOIN users student ON psr.student_id = student.id
      JOIN enrollments e ON student.id = e.student_id AND e.status = 'active'
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      WHERE psr.parent_id = $1
      GROUP BY u.id, u.name, u.email, u.phone
      ORDER BY u.name
    `, [parentId]);

    res.json({ teachers: teachersResult.rows });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance report for a child
router.get('/children/:childId/attendance', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.id;
    const { date_from, date_to, course_id } = req.query;

    // Verify parent-child relationship
    const relationshipResult = await pool.query(
      'SELECT id FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2',
      [parentId, childId]
    );

    if (relationshipResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let whereConditions = [`a.student_id = $1`];
    let queryParams = [childId];
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

    res.json({ attendance: attendanceResult.rows });
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;