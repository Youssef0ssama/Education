import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../courses/entities/course.entity';
import { Assignment } from '../assignments/entities/assignment.entity';

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
  ) {}

  async getTeacherCourses(teacherId: number) {
    return this.courseRepository.find({
      where: { instructorId: teacherId, isActive: true },
      relations: ['enrollments', 'assignments'],
      order: { createdAt: 'DESC' },
    });
  }

  async getCourseStudents(teacherId: number, courseId: number) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, instructorId: teacherId },
      relations: ['enrollments', 'enrollments.student'],
    });

    if (!course) {
      throw new Error('Course not found or access denied');
    }

    return course.enrollments.map(enrollment => ({
      ...enrollment.student,
      enrollmentDate: enrollment.enrollmentDate,
      progressPercentage: enrollment.progressPercentage,
      status: enrollment.status,
    }));
  }

  async createAssignment(teacherId: number, assignmentData: any) {
    const { courseId, ...data } = assignmentData;

    // Verify teacher owns the course
    const course = await this.courseRepository.findOne({
      where: { id: courseId, instructorId: teacherId },
    });

    if (!course) {
      throw new Error('Course not found or access denied');
    }

    const assignment = this.assignmentRepository.create({
      ...data,
      courseId,
      createdById: teacherId,
    });

    return this.assignmentRepository.save(assignment);
  }
}