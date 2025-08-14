// Test database connection and data
import bcrypt from 'bcrypt';
import pool from '../../config/database.js';

const testDatabase = async () => {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    const connectionTest = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connected at:', connectionTest.rows[0].current_time);
    
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Users table does not exist!');
      console.log('💡 Run: docker-compose up --build to initialize database');
      return;
    }
    
    console.log('✅ Users table exists');
    
    // Count users
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log('👥 Total users:', userCount.rows[0].count);
    
    // List users
    const users = await pool.query('SELECT id, name, email, role FROM users LIMIT 5');
    console.log('📋 Sample users:');
    users.rows.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    // Test specific demo user
    const testUser = await pool.query('SELECT * FROM users WHERE email = $1', ['john.student@education.com']);
    if (testUser.rows.length > 0) {
      const user = testUser.rows[0];
      console.log('\n🧪 Testing demo user:');
      console.log('✅ User found:', user.email);
      console.log('🔐 Password hash exists:', !!user.password_hash);
      console.log('📝 Hash preview:', user.password_hash.substring(0, 20) + '...');
      
      // Test password verification
      try {
        const isValid = await bcrypt.compare('password123', user.password_hash);
        console.log('🔑 Password "password123" verification:', isValid ? '✅ VALID' : '❌ INVALID');
        
        if (!isValid) {
          console.log('💡 Password hash is incorrect. Run: node fix-demo-users.js');
        }
      } catch (error) {
        console.log('❌ Password verification failed:', error.message);
      }
    } else {
      console.log('❌ Demo user john.student@education.com not found');
      console.log('💡 Run the database initialization script or fix-demo-users.js');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('💡 Make sure PostgreSQL is running and database is initialized');
  } finally {
    process.exit(0);
  }
};

testDatabase();