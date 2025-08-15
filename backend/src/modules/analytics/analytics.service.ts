import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../students/entities/enrollment.entity';
import { EnrollmentStatus } from '../../common/enums/enrollment-status.enum';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  async getSystemOverview() {
    const [totalUsers, totalCourses, totalEnrollments, activeStudents] = await Promise.all([
      this.userRepository.count({ where: { isActive: true } }),
      this.courseRepository.count({ where: { isActive: true } }),
      this.enrollmentRepository.count({ where: { status: EnrollmentStatus.ACTIVE } }),
      this.enrollmentRepository.count({ where: { status: EnrollmentStatus.ACTIVE } }), // Simplified
    ]);

    // Calculate completion rate (simplified)
    const completedEnrollments = await this.enrollmentRepository.count({
      where: { status: EnrollmentStatus.COMPLETED },
    });
    const courseCompletionRate = totalEnrollments > 0 
      ? (completedEnrollments / totalEnrollments) * 100 
      : 0;

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      activeStudents,
      courseCompletionRate: Math.round(courseCompletionRate * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }

  async getUserGrowth() {
    const userGrowth = await this.userRepository
      .createQueryBuilder('user')
      .select("DATE_TRUNC('month', user.createdAt)", 'month')
      .addSelect('COUNT(*)', 'count')
      .where('user.isActive = :isActive', { isActive: true })
      .groupBy("DATE_TRUNC('month', user.createdAt)")
      .orderBy('month', 'ASC')
      .getRawMany();

    return userGrowth;
  }

  async getCoursePopularity() {
    const coursePopularity = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.enrollments', 'enrollment', 'enrollment.status = :status', { status: EnrollmentStatus.ACTIVE })
      .select(['course.id', 'course.title'])
      .addSelect('COUNT(enrollment.id)', 'enrollmentCount')
      .where('course.isActive = :isActive', { isActive: true })
      .groupBy('course.id, course.title')
      .orderBy('enrollmentCount', 'DESC')
      .limit(10)
      .getRawMany();

    return coursePopularity;
  }
}