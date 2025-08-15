import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo() {
    return {
      message: 'Education Platform API',
      version: '1.0.0',
      documentation: '/api/docs',
      health: '/api/health',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        courses: '/api/courses',
        students: '/api/students',
        teachers: '/api/teachers',
        admin: '/api/admin',
        assignments: '/api/assignments',
        sessions: '/api/sessions',
        content: '/api/content',
        analytics: '/api/analytics',
        notifications: '/api/notifications',
      },
      timestamp: new Date().toISOString(),
    };
  }
}