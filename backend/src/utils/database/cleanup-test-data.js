import pool from '../../config/database.js';

async function cleanupTestData() {
  try {
    console.log('🧹 Cleaning up test data...');
    
    // Delete test courses (keep original courses)
    const testCoursePatterns = [
      'Test Course%',
      'Lifetime Course%', 
      'Direct Test Course%'
    ];
    
    for (const pattern of testCoursePatterns) {
      const result = await pool.query(
        'DELETE FROM courses WHERE title LIKE $1 RETURNING id, title',
        [pattern]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ Deleted ${result.rows.length} courses matching "${pattern}"`);
        result.rows.forEach(course => {
          console.log(`   - ${course.title} (ID: ${course.id})`);
        });
      }
    }
    
    // Clean up orphaned course_instructors
    await pool.query(`
      DELETE FROM course_instructors 
      WHERE course_id NOT IN (SELECT id FROM courses)
    `);
    
    // Clean up orphaned enrollments
    await pool.query(`
      DELETE FROM enrollments 
      WHERE course_id NOT IN (SELECT id FROM courses)
    `);
    
    // Reset sequence if needed
    const maxId = await pool.query('SELECT MAX(id) as max_id FROM courses');
    const nextId = (maxId.rows[0].max_id || 0) + 1;
    await pool.query(`ALTER SEQUENCE courses_id_seq RESTART WITH ${nextId}`);
    
    console.log('🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupTestData();