import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { checkResourceOwnership } from '../middleware/permissions.js';

const router = express.Router();

// Get assignments (filtered by user role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { course_id, student_id, page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Role-based filtering
    if (userRole === 'teacher') {
      // Teachers see assignments for their courses
      whereConditions.push(`c.instructor_id = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    } else if (userRole === 'student') {
      // Students see assignments for their enrolled courses
      whereConditions.push(`EXISTS (
        SELECT 1 FROM enrollments e 
        WHERE e.course_id = a.course_id 
        AND e.student_id = $${paramIndex} 
        AND e.status = 'active'
      )`);
      queryParams.push(userId);
      paramIndex++;
    } else if (userRole === 'parent') {
      // Parents see assignments for their children's courses
      whereConditions.push(`EXISTS (
        SELECT 1 FROM enrollments e 
        JOIN parent_student_relationships psr ON e.student_id = psr.student_id
        WHERE e.course_id = a.course_id 
        AND psr.parent_id = $${paramIndex} 
        AND e.status = 'active'
      )`);
      queryParams.push(userId);
      paramIndex++;
    }

    // Additional filters
    if (course_id) {
      whereConditions.push(`a.course_id = $${paramIndex}`);
      queryParams.push(course_id);
      paramIndex++;
    }

    if (student_id && ['admin', 'teacher'].includes(userRole)) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM submissions s 
        WHERE s.assignment_id = a.id 
        AND s.student_id = $${paramIndex}
      )`);
      queryParams.push(student_id);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get assignments with pagination
    const assignmentsQuery = `
      SELECT 
        a.id, a.title, a.description, a.due_date, a.max_points, a.assignment_type, a.created_at,
        c.title as course_title, c.id as course_id,
        u.name as created_by_name,
        COUNT(s.id) as submission_count,
        COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_count
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN submissions s ON a.id = s.assignment_id
      ${whereClause}
      GROUP BY a.id, a.title, a.description, a.due_date, a.max_points, a.assignment_type, a.created_at, c.title, c.id, u.name
      ORDER BY a.due_date DESC, a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const assignmentsResult = await pool.query(assignmentsQuery, queryParams);

    res.json({
      assignments: assignmentsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get assignment by ID with submissions
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get assignment details
    const assignmentResult = await pool.query(`
      SELECT 
        a.id, a.title, a.description, a.due_date, a.max_points, a.assignment_type, a.created_at,
        c.title as course_title, c.id as course_id, c.instructor_id,
        u.name as created_by_name
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = $1
    `, [id]);

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentResult.rows[0];

    // Check permissions
    if (userRole === 'teacher' && assignment.instructor_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (userRole === 'student') {
      // Check if student is enrolled in the course
      const enrollmentResult = await pool.query(
        'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2 AND status = $3',
        [userId, assignment.course_id, 'active']
      );
      if (enrollmentResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get submissions
    let submissionsQuery = `
      SELECT 
        s.id, s.submission_text, s.file_url, s.submitted_at, s.grade, s.feedback, s.graded_at,
        u.name as student_name, u.email as student_email, u.id as student_id,
        grader.name as graded_by_name
      FROM submissions s
      JOIN users u ON s.student_id = u.id
      LEFT JOIN users grader ON s.graded_by = grader.id
      WHERE s.assignment_id = $1
    `;

    let submissionParams = [id];

    // Filter submissions based on role
    if (userRole === 'student') {
      submissionsQuery += ' AND s.student_id = $2';
      submissionParams.push(userId);
    } else if (userRole === 'parent') {
      submissionsQuery += ` AND EXISTS (
        SELECT 1 FROM parent_student_relationships psr 
        WHERE psr.parent_id = $2 AND psr.student_id = s.student_id
      )`;
      submissionParams.push(userId);
    }

    submissionsQuery += ' ORDER BY s.submitted_at DESC';

    const submissionsResult = await pool.query(submissionsQuery, submissionParams);
    assignment.submissions = submissionsResult.rows;

    res.json({ assignment });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create assignment (Teacher only)
router.post('/', authenticateToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { course_id, title, description, due_date, max_points, assignment_type } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validation
    if (!course_id || !title || !description) {
      return res.status(400).json({ error: 'Course ID, title, and description are required' });
    }

    // Check if user can create assignments for this course
    if (userRole === 'teacher') {
      const courseResult = await pool.query(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [course_id, userId]
      );
      if (courseResult.rows.length === 0) {
        return res.status(403).json({ error: 'You can only create assignments for your own courses' });
      }
    } else if (userRole === 'admin') {
      // Admin can create assignments for any course, but need to verify course exists
      const courseResult = await pool.query('SELECT id FROM courses WHERE id = $1', [course_id]);
      if (courseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }
    }

    // Create assignment
    const result = await pool.query(`
      INSERT INTO assignments (course_id, title, description, due_date, max_points, assignment_type, created_by) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, course_id, title, description, due_date, max_points, assignment_type, created_at
    `, [course_id, title, description, due_date, max_points || 100, assignment_type || 'homework', userId]);

    res.status(201).json({
      message: 'Assignment created successfully',
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update assignment (Teacher/Admin only)
router.put('/:id', authenticateToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, due_date, max_points, assignment_type } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if assignment exists and user has permission
    const assignmentResult = await pool.query(`
      SELECT a.id, c.instructor_id 
      FROM assignments a 
      JOIN courses c ON a.course_id = c.id 
      WHERE a.id = $1
    `, [id]);

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentResult.rows[0];

    if (userRole === 'teacher' && assignment.instructor_id !== userId) {
      return res.status(403).json({ error: 'You can only edit assignments for your own courses' });
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

    if (due_date !== undefined) {
      updateFields.push(`due_date = $${paramIndex}`);
      queryParams.push(due_date);
      paramIndex++;
    }

    if (max_points !== undefined) {
      updateFields.push(`max_points = $${paramIndex}`);
      queryParams.push(max_points);
      paramIndex++;
    }

    if (assignment_type !== undefined) {
      updateFields.push(`assignment_type = $${paramIndex}`);
      queryParams.push(assignment_type);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    queryParams.push(id);

    const updateQuery = `
      UPDATE assignments 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING id, title, description, due_date, max_points, assignment_type
    `;

    const result = await pool.query(updateQuery, queryParams);

    res.json({
      message: 'Assignment updated successfully',
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete assignment (Teacher/Admin only)
router.delete('/:id', authenticateToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if assignment exists and user has permission
    const assignmentResult = await pool.query(`
      SELECT a.id, a.title, c.instructor_id 
      FROM assignments a 
      JOIN courses c ON a.course_id = c.id 
      WHERE a.id = $1
    `, [id]);

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentResult.rows[0];

    if (userRole === 'teacher' && assignment.instructor_id !== userId) {
      return res.status(403).json({ error: 'You can only delete assignments for your own courses' });
    }

    // Check if there are submissions
    const submissionsResult = await pool.query(
      'SELECT COUNT(*) as count FROM submissions WHERE assignment_id = $1',
      [id]
    );

    const hasSubmissions = parseInt(submissionsResult.rows[0].count) > 0;

    if (hasSubmissions) {
      return res.status(400).json({ 
        error: 'Cannot delete assignment with existing submissions',
        submissionCount: hasSubmissions
      });
    }

    // Delete assignment
    await pool.query('DELETE FROM assignments WHERE id = $1', [id]);

    res.json({
      message: 'Assignment deleted successfully',
      assignment: {
        id: assignment.id,
        title: assignment.title
      }
    });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit assignment (Student only)
router.post('/:id/submit', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const { id: assignmentId } = req.params;
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

    // Check if assignment is past due
    if (assignment.due_date && new Date(assignment.due_date) < new Date()) {
      return res.status(400).json({ error: 'Assignment is past due' });
    }

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
        submission: result.rows[0]
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
        submission: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Grade submission (Teacher/Admin only)
router.post('/submissions/:submissionId/grade', authenticateToken, requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate grade
    if (grade === undefined || grade < 0) {
      return res.status(400).json({ error: 'Valid grade is required' });
    }

    // Check if submission exists and user has permission to grade
    const submissionResult = await pool.query(`
      SELECT s.id, s.assignment_id, a.max_points, c.instructor_id, u.name as student_name
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON s.student_id = u.id
      WHERE s.id = $1
    `, [submissionId]);

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    if (userRole === 'teacher' && submission.instructor_id !== userId) {
      return res.status(403).json({ error: 'You can only grade submissions for your own courses' });
    }

    // Validate grade doesn't exceed max points
    if (grade > submission.max_points) {
      return res.status(400).json({ 
        error: `Grade cannot exceed maximum points (${submission.max_points})` 
      });
    }

    // Update submission with grade
    const result = await pool.query(`
      UPDATE submissions 
      SET grade = $1, feedback = $2, graded_by = $3, graded_at = CURRENT_TIMESTAMP 
      WHERE id = $4
      RETURNING id, grade, feedback, graded_at
    `, [grade, feedback, userId, submissionId]);

    res.json({
      message: 'Submission graded successfully',
      submission: result.rows[0],
      student_name: submission.student_name
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;