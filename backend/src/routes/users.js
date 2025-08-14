import express from 'express';
import bcrypt from 'bcrypt';
import validator from 'validator';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, status } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filter by role
    if (role && ['student', 'teacher', 'parent', 'admin'].includes(role)) {
      whereConditions.push(`role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }

    // Filter by status
    if (status) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(status === 'active');
      paramIndex++;
    }

    // Search by name or email
    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get users with pagination
    const usersQuery = `
      SELECT id, name, email, role, phone, date_of_birth, is_active, last_login, created_at, updated_at
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const usersResult = await pool.query(usersQuery, queryParams);

    res.json({
      users: usersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID (Admin or own profile)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Check permissions: admin can view any user, others can only view their own profile
    if (requestingUserRole !== 'admin' && parseInt(id) !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(`
      SELECT id, name, email, role, phone, date_of_birth, profile_image_url, is_active, last_login, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Get additional info based on role
    if (user.role === 'student') {
      // Get enrollment info
      const enrollmentsResult = await pool.query(`
        SELECT c.title, c.id, e.enrollment_date, e.status, e.progress_percentage
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = $1
        ORDER BY e.enrollment_date DESC
      `, [id]);
      user.enrollments = enrollmentsResult.rows;
    } else if (user.role === 'teacher') {
      // Get courses taught
      const coursesResult = await pool.query(`
        SELECT id, title, description, price, max_students, is_active, created_at,
               (SELECT COUNT(*) FROM enrollments WHERE course_id = courses.id AND status = 'active') as enrolled_students
        FROM courses 
        WHERE instructor_id = $1
        ORDER BY created_at DESC
      `, [id]);
      user.courses = coursesResult.rows;
    } else if (user.role === 'parent') {
      // Get children
      const childrenResult = await pool.query(`
        SELECT u.id, u.name, u.email, psr.relationship_type
        FROM parent_student_relationships psr
        JOIN users u ON psr.student_id = u.id
        WHERE psr.parent_id = $1
      `, [id]);
      user.children = childrenResult.rows;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, password, role, phone, date_of_birth } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!['student', 'teacher', 'parent', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, phone, date_of_birth, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, name, email, role, phone, date_of_birth, is_active, created_at
    `, [name, email, passwordHash, role, phone, date_of_birth, true]);

    const user = result.rows[0];

    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (Admin or own profile)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;
    const { name, email, phone, date_of_birth, role, is_active } = req.body;

    // Check permissions
    if (requestingUserRole !== 'admin' && parseInt(id) !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Non-admin users cannot change role or active status
    if (requestingUserRole !== 'admin' && (role !== undefined || is_active !== undefined)) {
      return res.status(403).json({ error: 'Insufficient permissions to modify role or status' });
    }

    // Validate email if provided
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'Email already taken by another user' });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      queryParams.push(name);
      paramIndex++;
    }

    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      queryParams.push(email);
      paramIndex++;
    }

    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      queryParams.push(phone);
      paramIndex++;
    }

    if (date_of_birth !== undefined) {
      updateFields.push(`date_of_birth = $${paramIndex}`);
      queryParams.push(date_of_birth);
      paramIndex++;
    }

    // Admin-only fields
    if (requestingUserRole === 'admin') {
      if (role !== undefined && ['student', 'teacher', 'parent', 'admin'].includes(role)) {
        updateFields.push(`role = $${paramIndex}`);
        queryParams.push(role);
        paramIndex++;
      }

      if (is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        queryParams.push(is_active);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    queryParams.push(id);

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING id, name, email, role, phone, date_of_birth, is_active, updated_at
    `;

    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const userResult = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Soft delete by deactivating the user instead of hard delete to maintain data integrity
    await pool.query('UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

    res.json({
      message: 'User deactivated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: false
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset user password (Admin only)
router.post('/:id/reset-password', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Check if user exists
    const userResult = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, id]);

    res.json({
      message: 'Password reset successfully',
      user: userResult.rows[0]
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Link parent to student (Admin only)
router.post('/:parentId/link-student/:studentId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { parentId, studentId } = req.params;
    const { relationship_type = 'parent' } = req.body;

    // Verify parent and student exist and have correct roles
    const parentResult = await pool.query('SELECT id, name, role FROM users WHERE id = $1 AND role = $2', [parentId, 'parent']);
    const studentResult = await pool.query('SELECT id, name, role FROM users WHERE id = $1 AND role = $2', [studentId, 'student']);

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if relationship already exists
    const existingRelation = await pool.query(
      'SELECT id FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2',
      [parentId, studentId]
    );

    if (existingRelation.rows.length > 0) {
      return res.status(409).json({ error: 'Relationship already exists' });
    }

    // Create relationship
    await pool.query(
      'INSERT INTO parent_student_relationships (parent_id, student_id, relationship_type) VALUES ($1, $2, $3)',
      [parentId, studentId, relationship_type]
    );

    res.json({
      message: 'Parent-student relationship created successfully',
      parent: parentResult.rows[0],
      student: studentResult.rows[0],
      relationship_type
    });
  } catch (error) {
    console.error('Link parent-student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unlink parent from student (Admin only)
router.delete('/:parentId/unlink-student/:studentId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { parentId, studentId } = req.params;

    const result = await pool.query(
      'DELETE FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2 RETURNING *',
      [parentId, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    res.json({
      message: 'Parent-student relationship removed successfully'
    });
  } catch (error) {
    console.error('Unlink parent-student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;