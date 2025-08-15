import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { Enrollment } from '../students/entities/enrollment.entity';
import { EnrollmentStatus } from '../../common/enums/enrollment-status.enum';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  async findAll(filters: any = {}): Promise<Course[]> {
    const { search, instructorId, isActive, limit } = filters;
    
    let queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor');

    if (isActive !== undefined) {
      queryBuilder.andWhere('course.isActive = :isActive', { isActive });
    } else {
      queryBuilder.andWhere('course.isActive = :isActive', { isActive: true });
    }

    if (search) {
      queryBuilder.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (instructorId) {
      queryBuilder.andWhere('course.instructorId = :instructorId', { instructorId });
    }

    if (limit) {
      queryBuilder.limit(limit);
    }

    return queryBuilder
      .orderBy('course.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['instructor', 'enrollments', 'assignments', 'content'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async create(courseData: Partial<Course>): Promise<Course> {
    const course = this.courseRepository.create(courseData);
    return this.courseRepository.save(course);
  }

  async update(id: number, updateData: Partial<Course>): Promise<Course> {
    await this.courseRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const course = await this.findOne(id);
    await this.courseRepository.update(id, { isActive: false });
  }

  async enrollStudent(courseId: number, studentId: number) {
    const course = await this.findOne(courseId);

    // Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
    });

    if (existingEnrollment && existingEnrollment.status === EnrollmentStatus.ACTIVE) {
      throw new ConflictException('Student is already enrolled in this course');
    }

    // Check course capacity
    const activeEnrollments = await this.enrollmentRepository.count({
      where: { courseId, status: EnrollmentStatus.ACTIVE },
    });

    if (activeEnrollments >= course.maxStudents) {
      throw new ConflictException('Course is at maximum capacity');
    }

    // Create or reactivate enrollment
    if (existingEnrollment) {
      existingEnrollment.status = EnrollmentStatus.ACTIVE;
      existingEnrollment.enrollmentDate = new Date();
      await this.enrollmentRepository.save(existingEnrollment);
    } else {
      const enrollment = this.enrollmentRepository.create({
        studentId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
        progressPercentage: 0,
      });
      await this.enrollmentRepository.save(enrollment);
    }

    return {
      message: 'Successfully enrolled in course',
      course: { id: course.id, title: course.title },
    };
  }
}