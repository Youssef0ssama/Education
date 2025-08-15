import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import all feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { AdminModule } from './modules/admin/admin.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ContentModule } from './modules/content/content.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';

// Import entities
import { User } from './modules/users/entities/user.entity';
import { Course } from './modules/courses/entities/course.entity';
import { Enrollment } from './modules/students/entities/enrollment.entity';
import { Assignment } from './modules/assignments/entities/assignment.entity';
import { Submission } from './modules/assignments/entities/submission.entity';
import { ClassSession } from './modules/sessions/entities/class-session.entity';
import { Attendance } from './modules/sessions/entities/attendance.entity';
import { Content } from './modules/content/entities/content.entity';
import { Notification } from './modules/notifications/entities/notification.entity';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database module with TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_DATABASE', 'education_platform'),
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
        synchronize: configService.get('NODE_ENV') !== 'production', // Auto-sync in development
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    CoursesModule,
    StudentsModule,
    TeachersModule,
    AdminModule,
    AssignmentsModule,
    SessionsModule,
    ContentModule,
    AnalyticsModule,
    NotificationsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}