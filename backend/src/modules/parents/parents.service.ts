import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../students/entities/enrollment.entity';
import { ClassSession } from '../sessions/entities/class-session.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { EnrollmentStatus } from '../../common/enums/enrollment-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class ParentsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(ClassSession)
    private readonly sessionRepository: Repository<ClassSession>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async getChildren(parentId: number) {
    // In a real implementation, you would have a parent-child relationship table
    // For now, we'll return a mock response since we don't have this relationship set up
    
    // This would typically be:
    // const children = await this.userRepository.find({
    //   where: { parentId, role: UserRole.STUDENT },
    //   relations: ['enrollments', 'enrollments.course'],
    // });

    // For demo purposes, return mock children data with the structure frontend expects
    const children = [
      {
        id: 1,
        name: 'Ahmad Al-Noor',
        email: 'ahmad@demo.com',
        role: UserRole.STUDENT,
        relationship_type: 'son',
        enrolled_courses: 4,
        avg_progress: 85,
        attended_sessions: 38,
        total_sessions: 40,
        avg_grade_percentage: 87,
      },
      {
        id: 2,
        name: 'Fatima Al-Noor',
        email: 'fatima@demo.com',
        role: UserRole.STUDENT,
        relationship_type: 'daughter',
        enrolled_courses: 3,
        avg_progress: 92,
        attended_sessions: 35,
        total_sessions: 36,
        avg_grade_percentage: 94,
      },
    ];

    return { children };
  }

  async getSchedule(parentId: number, filters: any = {}) {
    const { childId, startDate, endDate } = filters;

    // In a real implementation, you would:
    // 1. Get the parent's children
    // 2. Get their enrolled courses
    // 3. Get the sessions for those courses

    // For demo purposes, return mock schedule data with the structure frontend expects
    const sessions = [
      {
        id: 1,
        title: 'Math Class',
        course: { id: 1, title: 'Mathematics 101' },
        scheduled_start: new Date().toISOString(),
        scheduled_end: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour later
        child: { id: 1, name: 'Demo Child 1' },
        status: 'scheduled',
      },
      {
        id: 2,
        title: 'Science Lab',
        course: { id: 2, title: 'Science 101' },
        scheduled_start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
        scheduled_end: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours later
        child: { id: 2, name: 'Demo Child 2' },
        status: 'scheduled',
      },
      {
        id: 3,
        title: 'English Literature',
        course: { id: 3, title: 'English 101' },
        scheduled_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        scheduled_end: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        child: { id: 1, name: 'Demo Child 1' },
        status: 'scheduled',
      },
    ];

    return { sessions };
  }

  async getMessages(parentId: number, filters: any = {}) {
    const { childId, unreadOnly } = filters;

    // Get messages/notifications for the parent
    let queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :parentId', { parentId });

    if (unreadOnly) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead: false });
    }

    const notifications = await queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .getMany();

    // Convert notifications to message format that frontend expects
    const messages = notifications.map(notification => ({
      id: notification.id,
      subject: notification.title,
      content: notification.content,
      sender: 'System', // In a real app, this would be the actual sender
      recipient: 'Parent',
      timestamp: notification.createdAt,
      isRead: notification.isRead,
      type: notification.notificationType,
    }));

    return { messages };
  }

  async getTeachers(parentId: number, filters: any = {}) {
    const { childId } = filters;

    // In a real implementation, you would:
    // 1. Get the parent's children
    // 2. Get their enrolled courses
    // 3. Get the teachers for those courses

    // For demo purposes, get some teachers
    const teachers = await this.userRepository.find({
      where: { role: UserRole.TEACHER, isActive: true },
      select: ['id', 'name', 'email', 'phone'],
      take: 5,
    });

    // Add mock course information with the structure frontend expects
    const teachersWithCourses = teachers.map(teacher => ({
      ...teacher,
      courses: ['Mathematics 101', 'Science 101'], // Array of course names
      students: ['Demo Child 1', 'Demo Child 2'], // Array of student names
      contactInfo: {
        email: teacher.email,
        phone: teacher.phone,
        officeHours: 'Mon-Fri 2:00-4:00 PM',
      },
    }));

    return { teachers: teachersWithCourses };
  }

  async getChildProgress(parentId: number, childId: number) {
    // In a real implementation, you would:
    // 1. Verify the child belongs to this parent
    // 2. Get the child's enrollments and progress
    // 3. Get grades, attendance, and completion rates

    // For demo purposes, return mock progress data with the structure frontend expects
    const childName = childId === 1 ? 'Ahmad Al-Noor' : 'Fatima Al-Noor';
    const childEmail = childId === 1 ? 'ahmad@demo.com' : 'fatima@demo.com';

    const progress = {
      courses: [
        {
          id: 1,
          title: 'Quran Memorization - Juz 1',
          instructor_name: 'Sheikh Abdullah',
          progress_percentage: 78,
          attended_sessions: 19,
          total_sessions: 20,
          graded_assignments: 8,
          total_assignments: 10,
          avg_grade_percentage: 87,
        },
        {
          id: 2,
          title: 'Arabic Language Basics',
          instructor_name: 'Ustadha Aisha',
          progress_percentage: 82,
          attended_sessions: 17,
          total_sessions: 18,
          graded_assignments: 6,
          total_assignments: 8,
          avg_grade_percentage: 84,
        },
        {
          id: 3,
          title: 'Islamic Studies',
          instructor_name: 'Sheikh Omar',
          progress_percentage: 90,
          attended_sessions: 15,
          total_sessions: 15,
          graded_assignments: 5,
          total_assignments: 6,
          avg_grade_percentage: 92,
        },
      ],
      recentGrades: [
        {
          id: 1,
          assignment_title: 'Quran Recitation Test - Surah Al-Baqarah',
          course_title: 'Quran Memorization - Juz 1',
          assignment_type: 'Recitation',
          grade: 87,
          max_points: 100,
          feedback: 'Excellent memorization and tajweed. Keep practicing the pronunciation of some verses.',
          graded_by_name: 'Sheikh Abdullah',
          graded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 2,
          assignment_title: 'Arabic Grammar Exercise - Verb Conjugation',
          course_title: 'Arabic Language Basics',
          assignment_type: 'Written Assignment',
          grade: 84,
          max_points: 100,
          feedback: 'Good understanding of verb patterns. Review the irregular verbs for better accuracy.',
          graded_by_name: 'Ustadha Aisha',
          graded_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 3,
          assignment_title: 'Islamic History Quiz - The Rightly Guided Caliphs',
          course_title: 'Islamic Studies',
          assignment_type: 'Quiz',
          grade: 92,
          max_points: 100,
          feedback: 'Excellent knowledge of Islamic history. Well done!',
          graded_by_name: 'Sheikh Omar',
          graded_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      attendanceSummary: [
        {
          status: 'present',
          count: 45,
          percentage: 92,
        },
        {
          status: 'absent',
          count: 3,
          percentage: 6,
        },
        {
          status: 'late',
          count: 1,
          percentage: 2,
        },
      ],
    };

    // Return the structure the frontend expects
    return progress;
  }

  async sendMessage(parentId: number, messageData: any) {
    const { recipientId, subject, content, childId } = messageData;

    // In a real implementation, you would:
    // 1. Validate the recipient (teacher, admin, etc.)
    // 2. Create a message record in a messages table
    // 3. Send notifications

    // For demo purposes, create a notification
    const notification = this.notificationRepository.create({
      userId: recipientId || 1, // Default to admin if no recipient
      title: subject || 'New Message from Parent',
      content: content || 'No content provided',
      notificationType: 'message',
      isRead: false,
    });

    await this.notificationRepository.save(notification);

    return {
      message: 'Message sent successfully',
      messageId: notification.id,
      sentAt: new Date(),
    };
  }
}