import bcrypt from 'bcrypt';
import pool from '../../config/database.js';

async function seedDemoUsers() {
  try {
    console.log('🌱 Seeding demo users...');

    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Demo users to create
    const demoUsers = [
      {
        name: 'Admin User',
        email: 'admin@education.com',
        role: 'admin',
        phone: '+1234567890'
      },
      {
        name: 'Jane Teacher',
        email: 'jane.teacher@education.com',
        role: 'teacher',
        phone: '+1234567891'
      },
      {
        name: 'John Student',
        email: 'john.student@education.com',
        role: 'student',
        phone: '+1234567892'
      },
      {
        name: 'Mary Parent',
        email: 'mary.parent@education.com',
        role: 'parent',
        phone: '+1234567893'
      }
    ];

    for (const user of demoUsers) {
      try {
        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );

        if (existingUser.rows.length > 0) {
          console.log(`✅ User ${user.email} already exists`);
          continue;
        }

        // Create the user
        const result = await pool.query(
          `INSERT INTO users (name, email, password_hash, role, phone, is_active, created_at) 
           VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP) 
           RETURNING id, name, email, role`,
          [user.name, user.email, hashedPassword, user.role, user.phone]
        );

        console.log(`✅ Created user: ${result.rows[0].name} (${result.rows[0].email}) - ${result.rows[0].role}`);
      } catch (error) {
        console.error(`❌ Failed to create user ${user.email}:`, error.message);
      }
    }

    console.log('\n🎉 Demo user seeding completed!');
    console.log('\n📋 Demo Accounts:');
    console.log('Admin: admin@education.com / password123');
    console.log('Teacher: jane.teacher@education.com / password123');
    console.log('Student: john.student@education.com / password123');
    console.log('Parent: mary.parent@education.com / password123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the seeding
seedDemoUsers();