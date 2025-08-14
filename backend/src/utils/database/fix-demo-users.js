// Fix demo user passwords
import bcrypt from 'bcrypt';
import pool from '../../config/database.js';

const fixDemoUsers = async () => {
  try {
    console.log('🔧 Fixing demo user passwords...');
    
    // Generate proper hash for 'password123'
    const password = 'password123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    console.log('✅ Generated password hash for:', password);
    console.log('Hash:', passwordHash);
    
    // Update all demo users with the correct hash
    const demoUsers = [
      { email: 'admin@education.com', name: 'Admin User', role: 'admin' },
      { email: 'jane.teacher@education.com', name: 'Jane Smith', role: 'teacher' },
      { email: 'john.student@education.com', name: 'John Doe', role: 'student' },
      { email: 'mary.parent@education.com', name: 'Mary Parent', role: 'parent' },
      { email: 'bob.student@education.com', name: 'Bob Student', role: 'student' }
    ];
    
    for (const user of demoUsers) {
      // Check if user exists
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
      
      if (existingUser.rows.length > 0) {
        // Update existing user
        await pool.query(
          'UPDATE users SET password_hash = $1 WHERE email = $2',
          [passwordHash, user.email]
        );
        console.log(`✅ Updated password for: ${user.email}`);
      } else {
        // Create new user
        await pool.query(
          'INSERT INTO users (name, email, password_hash, role, phone, is_active) VALUES ($1, $2, $3, $4, $5, $6)',
          [user.name, user.email, passwordHash, user.role, '+1234567890', true]
        );
        console.log(`✅ Created user: ${user.email}`);
      }
    }
    
    // Test login with one user
    console.log('\n🧪 Testing password verification...');
    const testUser = await pool.query('SELECT * FROM users WHERE email = $1', ['john.student@education.com']);
    
    if (testUser.rows.length > 0) {
      const user = testUser.rows[0];
      const isValid = await bcrypt.compare('password123', user.password_hash);
      console.log(`Password verification for ${user.email}: ${isValid ? '✅ SUCCESS' : '❌ FAILED'}`);
    }
    
    console.log('\n🎉 Demo users fixed! You can now login with:');
    console.log('Email: john.student@education.com');
    console.log('Password: password123');
    
  } catch (error) {
    console.error('❌ Error fixing demo users:', error.message);
  } finally {
    process.exit(0);
  }
};

fixDemoUsers();