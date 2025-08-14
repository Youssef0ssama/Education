import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Student Dashboard Data
router.get('/student', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get enrolled courses with progress
    const coursesResult = await pool.query(`
      SELECT 
        c.id, c.title, c.description, c.duration_weeks,
        u.name as instructor_name,
        e.progress_percentage, e.status, e.enrollment_date,
        COUNT(cs.id) as total_sessions,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as attended_sessions
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN class_sessions cs ON c.id = cs.course_id
      LEFT JOIN attendance a ON cs.id = a.session_id AND a.student_id = e.student_id
      WHERE e.student_id = $1 AND e.status = 'active'
      GROUP BY c.id, c.title, c.description, c.duration_weeks, u.name, e.progress_percentage, e.status, e.enrollment_date
    `, [studentId]);

    // Get upcoming sessions
    const upcomingSessionsResult = await pool.query(`
      SELECT 
        cs.id, cs.title, cs.scheduled_start, cs.scheduled_end,
        c.title as course_title, c.id as course_id,
        cs.zoom_join_url
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      JOIN enrollments e ON c.id = e.course_id
      WHERE e.student_id = $1 
        AND cs.scheduled_start > NOW()
        AND cs.status = 'scheduled'
        AND e.status = 'active'
      ORDER BY cs.scheduled_start
      LIMIT 5
    `, [studentId]);

    // Get recent assignments
    const assignmentsResult = await pool.query(`
      SELECT 
        a.id, a.title, a.due_date, a.max_points,
        c.title as course_title,
        s.grade, s.submitted_at,
        CASE WHEN s.id IS NULL THEN 'not_submitted' ELSE 'submitted' END as submission_status
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = e.student_id
      WHERE e.student_id = $1 AND e.status = 'active'
      ORDER BY a.due_date DESC
      LIMIT 10
    `, [studentId]);

    // Get notifications
    const notificationsResult = await pool.query(`
      SELECT id, title, content, notification_type, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [studentId]);

    res.json({
      courses: coursesResult.rows,
      upcomingSessions: upcomingSessionsResult.rows,
      assignments: assignmentsResult.rows,
      notifications: notificationsResult.rows
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Teacher Dashboard Data
router.get('/teacher', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;

    // Get courses taught by teacher
    const coursesResult = await pool.query(`
      SELECT 
        c.id, c.title, c.description, c.price, c.max_students,
        COUNT(e.id) as enrolled_students,
        AVG(e.progress_percentage) as avg_progress
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      WHERE c.instructor_id = $1 AND c.is_active = true
      GROUP BY c.id, c.title, c.description, c.price, c.max_students
    `, [teacherId]);

    // Get upcoming sessions
    const upcomingSessionsResult = await pool.query(`
      SELECT 
        cs.id, cs.title, cs.scheduled_start, cs.scheduled_end,
        c.title as course_title, c.id as course_id,
        cs.zoom_meeting_id, cs.zoom_join_url
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      WHERE c.instructor_id = $1 
        AND cs.scheduled_start > NOW()
        AND cs.status = 'scheduled'
      ORDER BY cs.scheduled_start
      LIMIT 5
    `, [teacherId]);

    // Get assignments needing grading
    const pendingGradingResult = await pool.query(`
      SELECT 
        s.id, s.submitted_at,
        a.title as assignment_title, a.max_points,
        c.title as course_title,
        u.name as student_name
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON s.student_id = u.id
      WHERE a.created_by = $1 AND s.grade IS NULL
      ORDER BY s.submitted_at
      LIMIT 10
    `, [teacherId]);

    // Get recent student activity
    const studentActivityResult = await pool.query(`
      SELECT 
        u.name as student_name,
        c.title as course_title,
        e.progress_percentage,
        e.updated_at as last_activity
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN courses c ON e.course_id = c.id
      WHERE c.instructor_id = $1 AND e.status = 'active'
      ORDER BY e.updated_at DESC
      LIMIT 10
    `, [teacherId]);

    res.json({
      courses: coursesResult.rows,
      upcomingSessions: upcomingSessionsResult.rows,
      pendingGrading: pendingGradingResult.rows,
      studentActivity: studentActivityResult.rows
    });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Parent Dashboard Data
router.get('/parent', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;

    // Get children and their progress
    const childrenResult = await pool.query(`
      SELECT 
        u.id, u.name, u.email,
        COUNT(e.id) as enrolled_courses,
        AVG(e.progress_percentage) as avg_progress,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as total_attendance,
        COUNT(cs.id) as total_sessions
      FROM parent_student_relationships psr
      JOIN users u ON psr.student_id = u.id
      LEFT JOIN enrollments e ON u.id = e.student_id AND e.status = 'active'
      LEFT JOIN courses c ON e.course_id = c.id
      LEFT JOIN class_sessions cs ON c.id = cs.course_id
      LEFT JOIN attendance a ON cs.id = a.session_id AND a.student_id = u.id
      WHERE psr.parent_id = $1
      GROUP BY u.id, u.name, u.email
    `, [parentId]);

    // Get upcoming sessions for all children
    const upcomingSessionsResult = await pool.query(`
      SELECT 
        cs.id, cs.title, cs.scheduled_start, cs.scheduled_end,
        c.title as course_title,
        u.name as student_name
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      JOIN enrollments e ON c.id = e.course_id
      JOIN parent_student_relationships psr ON e.student_id = psr.student_id
      JOIN users u ON e.student_id = u.id
      WHERE psr.parent_id = $1 
        AND cs.scheduled_start > NOW()
        AND cs.status = 'scheduled'
        AND e.status = 'active'
      ORDER BY cs.scheduled_start
      LIMIT 10
    `, [parentId]);

    // Get recent grades and assignments
    const recentGradesResult = await pool.query(`
      SELECT 
        s.grade, s.graded_at,
        a.title as assignment_title, a.max_points,
        c.title as course_title,
        u.name as student_name
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON s.student_id = u.id
      JOIN parent_student_relationships psr ON u.id = psr.student_id
      WHERE psr.parent_id = $1 AND s.grade IS NOT NULL
      ORDER BY s.graded_at DESC
      LIMIT 10
    `, [parentId]);

    res.json({
      children: childrenResult.rows,
      upcomingSessions: upcomingSessionsResult.rows,
      recentGrades: recentGradesResult.rows
    });
  } catch (error) {
    console.error('Parent dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Dashboard Data
router.get('/admin', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Get platform statistics
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = true) as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND is_active = true) as total_teachers,
        (SELECT COUNT(*) FROM users WHERE role = 'parent' AND is_active = true) as total_parents,
        (SELECT COUNT(*) FROM courses WHERE is_active = true) as total_courses,
        (SELECT COUNT(*) FROM enrollments WHERE status = 'active') as active_enrollments,
        (SELECT SUM(amount) FROM transactions WHERE status = 'completed' AND transaction_type = 'payment') as total_revenue
    `);

    // Get recent user registrations
    const recentUsersResult = await pool.query(`
      SELECT id, name, email, role, created_at
      FROM users
      WHERE created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Get course enrollment trends
    const enrollmentTrendsResult = await pool.query(`
      SELECT 
        c.title as course_title,
        COUNT(e.id) as enrollment_count,
        AVG(e.progress_percentage) as avg_progress
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      WHERE c.is_active = true
      GROUP BY c.id, c.title
      ORDER BY enrollment_count DESC
      LIMIT 10
    `);

    // Get recent transactions
    const recentTransactionsResult = await pool.query(`
      SELECT 
        t.id, t.amount, t.status, t.transaction_type, t.created_at,
        u.name as user_name,
        c.title as course_title
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN courses c ON t.course_id = c.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    res.json({
      stats: statsResult.rows[0],
      recentUsers: recentUsersResult.rows,
      enrollmentTrends: enrollmentTrendsResult.rows,
      recentTransactions: recentTransactionsResult.rows
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;