import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get class sessions (filtered by user role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { course_id, date_from, date_to, status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Role-based filtering
    if (userRole === 'teacher') {
      whereConditions.push(`c.instructor_id = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    } else if (userRole === 'student') {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM enrollments e 
        WHERE e.course_id = cs.course_id 
        AND e.student_id = $${paramIndex} 
        AND e.status = 'active'
      )`);
      queryParams.push(userId);
      paramIndex++;
    } else if (userRole === 'parent') {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM enrollments e 
        JOIN parent_student_relationships psr ON e.student_id = psr.student_id
        WHERE e.course_id = cs.course_id 
        AND psr.parent_id = $${paramIndex} 
        AND e.status = 'active'
      )`);
      queryParams.push(userId);
      paramIndex++;
    }

    // Additional filters
    if (course_id) {
      whereConditions.push(`cs.course_id = $${paramIndex}`);
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

    if (status) {
      whereConditions.push(`cs.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get sessions with pagination
    const sessionsQuery = `
      SELECT 
        cs.id, cs.title, cs.description, cs.scheduled_start, cs.scheduled_end,
        cs.zoom_meeting_id, cs.zoom_join_url, cs.zoom_password, cs.status, cs.created_at,
        c.title as course_title, c.id as course_id,
        u.name as instructor_name,
        COUNT(a.id) as attendance_count,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN attendance a ON cs.id = a.session_id
      ${whereClause}
      GROUP BY cs.id, cs.title, cs.description, cs.scheduled_start, cs.scheduled_end,
               cs.zoom_meeting_id, cs.zoom_join_url, cs.zoom_password, cs.status, cs.created_at,
               c.title, c.id, u.name
      ORDER BY cs.scheduled_start DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const sessionsResult = await pool.query(sessionsQuery, queryParams);

    res.json({
      sessions: sessionsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get session by ID with attendance
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get session details
    const sessionResult = await pool.query(`
      SELECT 
        cs.id, cs.title, cs.description, cs.scheduled_start, cs.scheduled_end,
        cs.zoom_meeting_id, cs.zoom_join_url, cs.zoom_password, cs.status, cs.created_at,
        c.title as course_title, c.id as course_id, c.instructor_id,
        u.name as instructor_name
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE cs.id = $1
    `, [id]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Check permissions
    if (userRole === 'teacher' && session.instructor_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (userRole === 'student') {
      const enrollmentResult = await pool.query(
        'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2 AND status = $3',
        [userId, session.course_id, 'active']
      );
      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get attendance records
    const attendanceResult = await pool.query(`
      SELECT 
        a.id, a.status, a.join_time, a.leave_time, a.notes,
        u.name as student_name, u.email as student_email, u.id as student_id
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      WHERE a.session_id = $1
      ORDER BY u.name
    `, [id]);

    session.attendance = attendanceResult.rows;

    // Get enrolled students who haven't been marked for attendance yet
    const enrolledStudentsResult = await pool.query(`
      SELECT u.id, u.name, u.email
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.course_id = $1 AND e.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM attendance a 
        WHERE a.session_id = $2 AND a.student_id = u.id
      )
      ORDER BY u.name
    `, [session.course_id, id]);

    session.unmarked_students = enrolledStudentsResult.rows;

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create class session (Teacher/Admin only)
router.post('/', authenticateToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { course_id, title, description, scheduled_start, scheduled_end, zoom_meeting_id, zoom_join_url, zoom_password } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validation
    if (!course_id || !title || !scheduled_start || !scheduled_end) {
      return res.status(400).json({ error: 'Course ID, title, start time, and end time are required' });
    }

    // Check if user can create sessions for this course
    if (userRole === 'teacher') {
      const courseResult = await pool.query(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [course_id, userId]
      );
      if (courseResult.rows.length === 0) {
        return res.status(403).json({ error: 'You can only create sessions for your own courses' });
      }
    }

    // Validate dates
    const startDate = new Date(scheduled_start);
    const endDate = new Date(scheduled_end);
    
    if (startDate >= endDate) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Create session
    const result = await pool.query(`
      INSERT INTO class_sessions (course_id, title, description, scheduled_start, scheduled_end, zoom_meeting_id, zoom_join_url, zoom_password, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING id, course_id, title, description, scheduled_start, scheduled_end, zoom_meeting_id, zoom_join_url, status, created_at
    `, [course_id, title, description, scheduled_start, scheduled_end, zoom_meeting_id, zoom_join_url, zoom_password, 'scheduled']);

    res.status(201).json({
      message: 'Class session created successfully',
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update class session (Teacher/Admin only)
router.put('/:id', authenticateToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, scheduled_start, scheduled_end, zoom_meeting_id, zoom_join_url, zoom_password, status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if session exists and user has permission
    const sessionResult = await pool.query(`
      SELECT cs.id, c.instructor_id 
      FROM class_sessions cs 
      JOIN courses c ON cs.course_id = c.id 
      WHERE cs.id = $1
    `, [id]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    if (userRole === 'teacher' && session.instructor_id !== userId) {
      return res.status(403).json({ error: 'You can only edit sessions for your own courses' });
    }

    // Build update query
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

    if (scheduled_start !== undefined) {
      updateFields.push(`scheduled_start = $${paramIndex}`);
      queryParams.push(scheduled_start);
      paramIndex++;
    }

    if (scheduled_end !== undefined) {
      updateFields.push(`scheduled_end = $${paramIndex}`);
      queryParams.push(scheduled_end);
      paramIndex++;
    }

    if (zoom_meeting_id !== undefined) {
      updateFields.push(`zoom_meeting_id = $${paramIndex}`);
      queryParams.push(zoom_meeting_id);
      paramIndex++;
    }

    if (zoom_join_url !== undefined) {
      updateFields.push(`zoom_join_url = $${paramIndex}`);
      queryParams.push(zoom_join_url);
      paramIndex++;
    }

    if (zoom_password !== undefined) {
      updateFields.push(`zoom_password = $${paramIndex}`);
      queryParams.push(zoom_password);
      paramIndex++;
    }

    if (status !== undefined && ['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      updateFields.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    queryParams.push(id);

    const updateQuery = `
      UPDATE class_sessions 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING id, title, description, scheduled_start, scheduled_end, zoom_meeting_id, zoom_join_url, status
    `;

    const result = await pool.query(updateQuery, queryParams);

    res.json({
      message: 'Session updated successfully',
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete class session (Teacher/Admin only)
router.delete('/:id', authenticateToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if session exists and user has permission
    const sessionResult = await pool.query(`
      SELECT cs.id, cs.title, c.instructor_id 
      FROM class_sessions cs 
      JOIN courses c ON cs.course_id = c.id 
      WHERE cs.id = $1
    `, [id]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    if (userRole === 'teacher' && session.instructor_id !== userId) {
      return res.status(403).json({ error: 'You can only delete sessions for your own courses' });
    }

    // Check if there are attendance records
    const attendanceResult = await pool.query(
      'SELECT COUNT(*) as count FROM attendance WHERE session_id = $1',
      [id]
    );

    const hasAttendance = parseInt(attendanceResult.rows[0].count) > 0;

    if (hasAttendance) {
      return res.status(400).json({ 
        error: 'Cannot delete session with existing attendance records',
        attendanceCount: hasAttendance
      });
    }

    // Delete session
    await pool.query('DELETE FROM class_sessions WHERE id = $1', [id]);

    res.json({
      message: 'Session deleted successfully',
      session: {
        id: session.id,
        title: session.title
      }
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark attendance (Teacher/Admin only)
router.post('/:id/attendance', authenticateToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { student_id, status, join_time, leave_time, notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validation
    if (!student_id || !status) {
      return res.status(400).json({ error: 'Student ID and status are required' });
    }

    if (!['present', 'absent', 'late', 'excused'].includes(status)) {
      return res.status(400).json({ error: 'Invalid attendance status' });
    }

    // Check if session exists and user has permission
    const sessionResult = await pool.query(`
      SELECT cs.id, c.instructor_id, c.id as course_id
      FROM class_sessions cs 
      JOIN courses c ON cs.course_id = c.id 
      WHERE cs.id = $1
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    if (userRole === 'teacher' && session.instructor_id !== userId) {
      return res.status(403).json({ error: 'You can only mark attendance for your own courses' });
    }

    // Check if student is enrolled in the course
    const enrollmentResult = await pool.query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2 AND status = $3',
      [student_id, session.course_id, 'active']
    );

    if (enrollmentResult.rows.length === 0) {
      return res.status(400).json({ error: 'Student is not enrolled in this course' });
    }

    // Check if attendance already exists
    const existingAttendance = await pool.query(
      'SELECT id FROM attendance WHERE session_id = $1 AND student_id = $2',
      [sessionId, student_id]
    );

    if (existingAttendance.rows.length > 0) {
      // Update existing attendance
      const result = await pool.query(`
        UPDATE attendance 
        SET status = $1, join_time = $2, leave_time = $3, notes = $4
        WHERE session_id = $5 AND student_id = $6
        RETURNING id, status, join_time, leave_time, notes
      `, [status, join_time, leave_time, notes, sessionId, student_id]);

      res.json({
        message: 'Attendance updated successfully',
        attendance: result.rows[0]
      });
    } else {
      // Create new attendance record
      const result = await pool.query(`
        INSERT INTO attendance (session_id, student_id, status, join_time, leave_time, notes) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING id, status, join_time, leave_time, notes
      `, [sessionId, student_id, status, join_time, leave_time, notes]);

      res.status(201).json({
        message: 'Attendance marked successfully',
        attendance: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk mark attendance (Teacher/Admin only)
router.post('/:id/attendance/bulk', authenticateToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { attendance_records } = req.body; // Array of {student_id, status, join_time, leave_time, notes}
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!Array.isArray(attendance_records) || attendance_records.length === 0) {
      return res.status(400).json({ error: 'Attendance records array is required' });
    }

    // Check if session exists and user has permission
    const sessionResult = await pool.query(`
      SELECT cs.id, c.instructor_id, c.id as course_id
      FROM class_sessions cs 
      JOIN courses c ON cs.course_id = c.id 
      WHERE cs.id = $1
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    if (userRole === 'teacher' && session.instructor_id !== userId) {
      return res.status(403).json({ error: 'You can only mark attendance for your own courses' });
    }

    const results = [];
    const errors = [];

    // Process each attendance record
    for (const record of attendance_records) {
      try {
        const { student_id, status, join_time, leave_time, notes } = record;

        // Validate status
        if (!['present', 'absent', 'late', 'excused'].includes(status)) {
          errors.push({ student_id, error: 'Invalid attendance status' });
          continue;
        }

        // Check if student is enrolled
        const enrollmentResult = await pool.query(
          'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2 AND status = $3',
          [student_id, session.course_id, 'active']
        );

        if (enrollmentResult.rows.length === 0) {
          errors.push({ student_id, error: 'Student not enrolled in course' });
          continue;
        }

        // Upsert attendance record
        const result = await pool.query(`
          INSERT INTO attendance (session_id, student_id, status, join_time, leave_time, notes) 
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (session_id, student_id) 
          DO UPDATE SET status = $3, join_time = $4, leave_time = $5, notes = $6
          RETURNING id, student_id, status
        `, [sessionId, student_id, status, join_time, leave_time, notes]);

        results.push(result.rows[0]);
      } catch (error) {
        errors.push({ student_id: record.student_id, error: error.message });
      }
    }

    res.json({
      message: 'Bulk attendance processing completed',
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Bulk mark attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;