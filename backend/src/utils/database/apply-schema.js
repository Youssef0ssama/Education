import pool from '../../config/database.js';
import fs from 'fs';
import path from 'path';

async function applySchema() {
  try {
    console.log('📊 Applying database schema...');
    
    const schemaPath = path.resolve('../../../database/admin-course-management-schema.sql');
    console.log('Looking for schema at:', schemaPath);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log('✅ Executed statement successfully');
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log('⚠️ Object already exists, skipping...');
          } else {
            console.error('❌ Statement error:', error.message);
          }
        }
      }
    }
    
    console.log('🎉 Schema application completed!');
  } catch (error) {
    console.error('❌ Schema application failed:', error.message);
  } finally {
    await pool.end();
  }
}

applySchema();