import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { runSeeds } from './seeds';

// Import entities
import { User } from '../modules/users/entities/user.entity';
import { Course } from '../modules/courses/entities/course.entity';
import { Enrollment } from '../modules/students/entities/enrollment.entity';
import { Assignment } from '../modules/assignments/entities/assignment.entity';
import { Submission } from '../modules/assignments/entities/submission.entity';
import { ClassSession } from '../modules/sessions/entities/class-session.entity';
import { Attendance } from '../modules/sessions/entities/attendance.entity';
import { Content } from '../modules/content/entities/content.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';

// Load environment variables
config();

const configService = new ConfigService();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'password'),
  database: configService.get('DB_DATABASE', 'education_db'),
  entities: [
    User,
    Course,
    Enrollment,
    Assignment,
    Submission,
    ClassSession,
    Attendance,
    Content,
    Notification,
  ],
  synchronize: false, // Don't auto-sync in seed script
  logging: false,
});

async function seed() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');

    await runSeeds(AppDataSource);

    console.log('🎉 Seeding process completed!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

seed();