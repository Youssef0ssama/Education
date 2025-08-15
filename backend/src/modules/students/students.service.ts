import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { Course } from '../courses/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { Submission } from '../assignments/entities/submission.entity';
import { ClassSession } from '../sessions/entities/class-session.entity';
import { EnrollmentStatus } from '../../common/enums/enrollment-status.enum';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(ClassSession)
    private readonly sessionRepository: Repository<ClassSession>,
  ) {}

  async getEnrolledCourses(studentId: number, status: EnrollmentStatus = EnrollmentStatus.ACTIVE) {
    const enrollments = await this.enrollmentRepository.find({
      where: { studentId, status },
      relations: ['course', 'course.instructor'],
      order: { enrollmentDate: 'DESC' },
    });

    return enrollments.map(enrollment => ({
      ...enrollment.course,
      enrollmentDate: enrollment.enrollmentDate,
      progressPercentage: enrollment.progressPercentage,
      finalGrade: enrollment.finalGrade,
      status: enrollment.status,
    }));
  }

  async getAvailableCourses(studentId: number, filters: any = {}) {
    const { search, instructorId, priceMax } = filters;

    let queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoin('course.enrollments', 'enrollment', 'enrollment.studentId = :studentId AND enrollment.status IN (:...statuses)', {
        studentId,
        statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
      })
      .where('course.isActive = :isActive', { isActive: true })
      .andWhere('enrollment.id IS NULL'); // Not already enrolled

    if (search) {
      queryBuilder.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (instructorId) {
      queryBuilder.andWhere('course.instructorId = :instructorId', { instructorId });
    }

    if (priceMax) {
      queryBuilder.andWhere('course.price <= :priceMax', { priceMax });
    }

    return queryBuilder.getMany();
  }

  async enrollInCourse(studentId: number, courseId: number) {
    // Check if course exists and is active
    const course = await this.courseRepository.findOne({
      where: { id: courseId, isActive: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found or inactive');
    }

    // Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === EnrollmentStatus.ACTIVE) {
        throw new ConflictException('Already enrolled in this course');
      } else {
        // Reactivate enrollment
        existingEnrollment.status = EnrollmentStatus.ACTIVE;
        existingEnrollment.enrollmentDate = new Date();
        await this.enrollmentRepository.save(existingEnrollment);
        return { message: 'Enrollment reactivated successfully' };
      }
    }

    // Check course capacity
    const activeEnrollments = await this.enrollmentRepository.count({
      where: { courseId, status: EnrollmentStatus.ACTIVE },
    });

    if (activeEnrollments >= course.maxStudents) {
      throw new BadRequestException('Course is at maximum capacity');
    }

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      studentId,
      courseId,
      status: EnrollmentStatus.ACTIVE,
      progressPercentage: 0,
    });

    await this.enrollmentRepository.save(enrollment);

    return {
      message: 'Successfully enrolled in course',
      enrollment,
      course: { id: course.id, title: course.title },
    };
  }

  async getStudentAssignments(studentId: number, filters: any = {}) {
    const { courseId, status, dueDateFilter } = filters;

    let queryBuilder = this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.course', 'course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('assignment.submissions', 'submission', 'submission.studentId = :studentId', { studentId })
      .innerJoin('course.enrollments', 'enrollment', 'enrollment.studentId = :studentId AND enrollment.status = :enrollmentStatus', {
        studentId,
        enrollmentStatus: EnrollmentStatus.ACTIVE,
      });

    if (courseId) {
      queryBuilder.andWhere('course.id = :courseId', { courseId });
    }

    if (status === 'submitted') {
      queryBuilder.andWhere('submission.id IS NOT NULL');
    } else if (status === 'not_submitted') {
      queryBuilder.andWhere('submission.id IS NULL');
    } else if (status === 'graded') {
      queryBuilder.andWhere('submission.grade IS NOT NULL');
    } else if (status === 'overdue') {
      queryBuilder.andWhere('assignment.dueDate < :now AND submission.id IS NULL', { now: new Date() });
    }

    if (dueDateFilter === 'upcoming') {
      queryBuilder.andWhere('assignment.dueDate > :now AND assignment.dueDate <= :weekFromNow', {
        now: new Date(),
        weekFromNow: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    } else if (dueDateFilter === 'overdue') {
      queryBuilder.andWhere('assignment.dueDate < :now AND submission.id IS NULL', { now: new Date() });
    }

    return queryBuilder
      .orderBy('assignment.dueDate', 'ASC', 'NULLS LAST')
      .addOrderBy('assignment.createdAt', 'DESC')
      .getMany();
  }

  async submitAssignment(studentId: number, assignmentId: number, submissionData: any) {
    const { submissionText, fileUrl } = submissionData;

    // Check if assignment exists and student is enrolled
    const assignment = await this.assignmentRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.course', 'course')
      .innerJoin('course.enrollments', 'enrollment', 'enrollment.studentId = :studentId AND enrollment.status = :status', {
        studentId,
        status: EnrollmentStatus.ACTIVE,
      })
      .where('assignment.id = :assignmentId', { assignmentId })
      .getOne();

    if (!assignment) {
      throw new NotFoundException('Assignment not found or you are not enrolled in this course');
    }

    const isPastDue = assignment.dueDate && assignment.dueDate < new Date();

    // Check if student has already submitted
    const existingSubmission = await this.submissionRepository.findOne({
      where: { assignmentId, studentId },
    });

    if (existingSubmission) {
      // Update existing submission
      existingSubmission.submissionText = submissionText;
      existingSubmission.fileUrl = fileUrl;
      existingSubmission.submittedAt = new Date();
      
      const updatedSubmission = await this.submissionRepository.save(existingSubmission);
      
      return {
        message: 'Assignment submission updated successfully',
        submission: updatedSubmission,
        isPastDue,
      };
    } else {
      // Create new submission
      const submission = this.submissionRepository.create({
        assignmentId,
        studentId,
        submissionText,
        fileUrl,
      });

      const savedSubmission = await this.submissionRepository.save(submission);

      return {
        message: 'Assignment submitted successfully',
        submission: savedSubmission,
        isPastDue,
      };
    }
  }

  async getStudentGrades(studentId: number, filters: any = {}) {
    const { courseId, assignmentType } = filters;

    let queryBuilder = this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.assignment', 'assignment')
      .leftJoinAndSelect('assignment.course', 'course')
      .leftJoinAndSelect('submission.gradedBy', 'grader')
      .where('submission.studentId = :studentId AND submission.grade IS NOT NULL', { studentId });

    if (courseId) {
      queryBuilder.andWhere('course.id = :courseId', { courseId });
    }

    if (assignmentType) {
      queryBuilder.andWhere('assignment.assignmentType = :assignmentType', { assignmentType });
    }

    const grades = await queryBuilder
      .orderBy('submission.gradedAt', 'DESC')
      .getMany();

    // Calculate statistics
    const stats = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoin('course.assignments', 'assignment')
      .leftJoin('assignment.submissions', 'submission', 'submission.studentId = :studentId AND submission.grade IS NOT NULL', { studentId })
      .where('enrollment.studentId = :studentId AND enrollment.status = :status', {
        studentId,
        status: EnrollmentStatus.ACTIVE,
      })
      .select([
        'course.id',
        'course.title',
        'COUNT(DISTINCT assignment.id) as totalAssignments',
        'COUNT(submission.id) as gradedAssignments',
        'AVG(submission.grade / assignment.maxPoints * 100) as averageGrade',
      ])
      .groupBy('course.id, course.title')
      .getRawMany();

    return {
      grades,
      statistics: stats,
    };
  }

  async getSchedule(studentId: number, filters: any = {}) {
    const { startDate, endDate } = filters;
    
    let queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.course', 'course')
      .leftJoin('course.enrollments', 'enrollment')
      .where('enrollment.studentId = :studentId AND enrollment.status = :status', {
        studentId,
        status: EnrollmentStatus.ACTIVE,
      });

    if (startDate) {
      queryBuilder.andWhere('session.scheduledStart >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('session.scheduledStart <= :endDate', { endDate: new Date(endDate) });
    }

    const sessions = await queryBuilder
      .orderBy('session.scheduledStart', 'ASC')
      .getMany();

    return { sessions };
  }

  async getWaitlist(studentId: number) {
    // For now, return empty waitlist - this would be implemented based on business logic
    return { waitlist: [] };
  }

  async dropFromCourse(studentId: number, courseId: number) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId, status: EnrollmentStatus.ACTIVE },
    });

    if (!enrollment) {
      throw new NotFoundException('Active enrollment not found for this course');
    }

    enrollment.status = EnrollmentStatus.DROPPED;
    await this.enrollmentRepository.save(enrollment);

    return {
      message: 'Successfully dropped from course',
      enrollment,
    };
  }

  async getCourseDetails(studentId: number, courseId: number) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
      relations: ['course', 'course.instructor', 'course.assignments', 'course.sessions'],
    });

    if (!enrollment) {
      throw new NotFoundException('You are not enrolled in this course');
    }

    // Get student's submissions for this course
    const submissions = await this.submissionRepository.find({
      where: { 
        studentId,
        assignment: { courseId },
      },
      relations: ['assignment'],
    });

    return {
      course: enrollment.course,
      enrollment: {
        enrollmentDate: enrollment.enrollmentDate,
        status: enrollment.status,
        progressPercentage: enrollment.progressPercentage,
        finalGrade: enrollment.finalGrade,
      },
      submissions,
    };
  }
}