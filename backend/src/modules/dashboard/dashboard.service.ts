import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../students/entities/enrollment.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { Submission } from '../assignments/entities/submission.entity';
import { ClassSession } from '../sessions/entities/class-session.entity';
import { Notification } from '../notifications/entities/notification.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(ClassSession)
    private readonly sessionRepository: Repository<ClassSession>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async getAdminDashboard() {
    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      activeUsers,
      recentUsers,
      recentCourses,
    ] = await Promise.all([
      this.userRepository.count(),
      this.courseRepository.count(),
      this.enrollmentRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.find({
        order: { createdAt: 'DESC' },
        take: 5,
        select: ['id', 'name', 'email', 'role', 'createdAt'],
      }),
      this.courseRepository.find({
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['instructor'],
        select: {
          id: true,
          title: true,
          createdAt: true,
          instructor: { id: true, name: true },
        },
      }),
    ]);

    return {
      stats: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        activeUsers,
      },
      recentUsers,
      recentCourses,
    };
  }

  async getTeacherDashboard(teacherId: number) {
    const [
      myCourses,
      totalStudents,
      pendingAssignments,
      upcomingSessions,
      recentSubmissions,
    ] = await Promise.all([
      this.courseRepository.count({ where: { instructorId: teacherId } }),
      this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .leftJoin('enrollment.course', 'course')
        .where('course.instructorId = :teacherId', { teacherId })
        .getCount(),
      this.assignmentRepository.count({
        where: { createdById: teacherId, isActive: true },
      }),
      this.sessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.course', 'course')
        .where('course.instructorId = :teacherId', { teacherId })
        .andWhere('session.scheduledStart >= :now', { now: new Date() })
        .orderBy('session.scheduledStart', 'ASC')
        .take(5)
        .getMany(),
      this.submissionRepository
        .createQueryBuilder('submission')
        .leftJoinAndSelect('submission.assignment', 'assignment')
        .leftJoinAndSelect('submission.student', 'student')
        .where('assignment.createdById = :teacherId', { teacherId })
        .orderBy('submission.submittedAt', 'DESC')
        .take(5)
        .getMany(),
    ]);

    return {
      stats: {
        myCourses,
        totalStudents,
        pendingAssignments,
        upcomingSessions: upcomingSessions.length,
      },
      upcomingSessions,
      recentSubmissions,
    };
  }

  async getStudentDashboard(studentId: number) {
    const [
      enrolledCourses,
      completedAssignments,
      pendingAssignments,
      upcomingSessions,
      recentGrades,
      notifications,
    ] = await Promise.all([
      this.enrollmentRepository.count({ where: { studentId } }),
      this.submissionRepository
        .createQueryBuilder('submission')
        .where('submission.studentId = :studentId', { studentId })
        .andWhere('submission.grade IS NOT NULL')
        .getCount(),
      this.assignmentRepository
        .createQueryBuilder('assignment')
        .leftJoin('assignment.course', 'course')
        .leftJoin('course.enrollments', 'enrollment')
        .where('enrollment.studentId = :studentId', { studentId })
        .andWhere('assignment.isActive = :isActive', { isActive: true })
        .getCount(),
      this.sessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.course', 'course')
        .leftJoin('course.enrollments', 'enrollment')
        .where('enrollment.studentId = :studentId', { studentId })
        .andWhere('session.scheduledStart >= :now', { now: new Date() })
        .orderBy('session.scheduledStart', 'ASC')
        .take(5)
        .getMany(),
      this.submissionRepository
        .createQueryBuilder('submission')
        .leftJoinAndSelect('submission.assignment', 'assignment')
        .where('submission.studentId = :studentId', { studentId })
        .andWhere('submission.grade IS NOT NULL')
        .orderBy('submission.gradedAt', 'DESC')
        .take(5)
        .getMany(),
      this.notificationRepository.find({
        where: { userId: studentId, isRead: false },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    return {
      stats: {
        enrolledCourses,
        completedAssignments,
        pendingAssignments,
        upcomingSessions: upcomingSessions.length,
      },
      upcomingSessions,
      recentGrades,
      notifications,
    };
  }

  async getParentDashboard(parentId: number) {
    // For now, return basic parent dashboard
    // In a real app, you'd link parents to students
    const notifications = await this.notificationRepository.find({
      where: { userId: parentId, isRead: false },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      stats: {
        children: 0, // Would be actual children count
        totalCourses: 0,
        upcomingEvents: 0,
        unreadNotifications: notifications.length,
      },
      notifications,
      children: [], // Would be actual children data
    };
  }
}