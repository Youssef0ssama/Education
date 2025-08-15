import { DataSource } from 'typeorm';
import { seedDemoUsers } from './demo-users.seed';

export async function runSeeds(dataSource: DataSource) {
  console.log('🌱 Starting database seeding...');
  
  try {
    await seedDemoUsers(dataSource);
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}