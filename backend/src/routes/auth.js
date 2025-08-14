import express from 'express';
import bcrypt from 'bcrypt';
import validator from 'validator';
import pool from '../config/database.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'student', phone } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!['student', 'teacher', 'parent'].includes(role)) {
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
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
      [name, email, passwordHash, role, phone]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.email, user.role);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', { email: req.body.email, hasPassword: !!req.body.password });
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('Querying database for user:', email);
    
    // Get user from database
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    console.log('Database query result:', { found: result.rows.length > 0 });

    if (result.rows.length === 0) {
      console.log('User not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log('User found:', { id: user.id, email: user.email, role: user.role, active: user.is_active });

    if (!user.is_active) {
      console.log('User account is deactivated:', email);
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    console.log('Verifying password...');
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password verification result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Updating last login...');
    
    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    console.log('Generating token...');
    const token = generateToken(user.id, user.email, user.role);

    console.log('Login successful for user:', email);
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user info (for API compatibility)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, phone, date_of_birth, profile_image_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, phone, date_of_birth, profile_image_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, date_of_birth } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), date_of_birth = COALESCE($3, date_of_birth), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, email, role, phone, date_of_birth',
      [name, phone, date_of_birth, userId]
    );

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;