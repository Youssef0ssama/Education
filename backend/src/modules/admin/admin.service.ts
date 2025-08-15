import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../students/entities/enrollment.entity';
import { EnrollmentStatus } from '../../common/enums/enrollment-status.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  async getDashboardStats() {
    const [totalUsers, totalCourses, totalEnrollments] = await Promise.all([
      this.userRepository.count({ where: { isActive: true } }),
      this.courseRepository.count({ where: { isActive: true } }),
      this.enrollmentRepository.count({ where: { status: EnrollmentStatus.ACTIVE } }),
    ]);

    const usersByRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('user.isActive = :isActive', { isActive: true })
      .groupBy('user.role')
      .getRawMany();

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      usersByRole,
      timestamp: new Date().toISOString(),
    };
  }

  async getAllUsers(page: number = 1, limit: number = 10, filters: any = {}) {
    const { role, search } = filters;
    const offset = (page - 1) * limit;

    let queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true });

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [users, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAllCourses(page: number = 1, limit: number = 10, filters: any = {}) {
    const { instructorId, isActive, search } = filters;
    const offset = (page - 1) * limit;

    let queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoin('course.enrollments', 'enrollment', 'enrollment.status = :enrollmentStatus', {
        enrollmentStatus: EnrollmentStatus.ACTIVE,
      })
      .addSelect('COUNT(enrollment.id)', 'enrolledStudents')
      .groupBy('course.id, instructor.id');

    if (instructorId) {
      queryBuilder.andWhere('course.instructorId = :instructorId', { instructorId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('course.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [courses, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .orderBy('course.createdAt', 'DESC')
      .getManyAndCount();

    return {
      courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async deactivateUser(userId: number) {
    await this.userRepository.update(userId, { isActive: false });
    return { message: 'User deactivated successfully' };
  }

  async reactivateUser(userId: number) {
    await this.userRepository.update(userId, { isActive: true });
    return { message: 'User reactivated successfully' };
  }
}