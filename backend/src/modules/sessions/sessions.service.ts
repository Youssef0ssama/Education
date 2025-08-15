import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSession } from './entities/class-session.entity';
import { Attendance } from './entities/attendance.entity';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(ClassSession)
    private readonly sessionRepository: Repository<ClassSession>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) { }

  async findAll(filters: any = {}): Promise<ClassSession[]> {
    const { courseId, status, startDate, endDate } = filters;

    let queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.course', 'course')
      .leftJoinAndSelect('session.attendanceRecords', 'attendance');

    if (courseId) {
      queryBuilder.andWhere('session.courseId = :courseId', { courseId });
    }

    if (status) {
      queryBuilder.andWhere('session.status = :status', { status });
    }

    if (startDate) {
      queryBuilder.andWhere('session.scheduledStart >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('session.scheduledStart <= :endDate', { endDate: new Date(endDate) });
    }

    return queryBuilder
      .orderBy('session.scheduledStart', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<ClassSession> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: ['course', 'attendanceRecords', 'attendanceRecords.student'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async create(createSessionDto: any, userId: number) {
    const { courseId, title, description, scheduledStart, scheduledEnd, zoomMeetingId, zoomJoinUrl, zoomPassword } = createSessionDto;

    // Verify the course exists and user has permission
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['instructor'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if user is the instructor or admin (simplified check)
    // In a real app, you'd check roles more thoroughly
    if (course.instructorId !== userId) {
      // Allow admins to create sessions for any course
      // This would typically check user role
    }

    const session = this.sessionRepository.create({
      courseId,
      title,
      description,
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: new Date(scheduledEnd),
      zoomMeetingId,
      zoomJoinUrl,
      zoomPassword,
      status: 'scheduled',
    });

    const savedSession = await this.sessionRepository.save(session);

    return {
      message: 'Session created successfully',
      session: savedSession,
    };
  }

  async update(id: number, updateSessionDto: any, userId: number) {
    const session = await this.findOne(id);

    // Check permissions (simplified)
    const course = await this.courseRepository.findOne({
      where: { id: session.courseId },
    });

    if (course && course.instructorId !== userId) {
      // Allow admins to update any session
      // This would typically check user role
    }

    Object.assign(session, updateSessionDto);

    if (updateSessionDto.scheduledStart) {
      session.scheduledStart = new Date(updateSessionDto.scheduledStart);
    }

    if (updateSessionDto.scheduledEnd) {
      session.scheduledEnd = new Date(updateSessionDto.scheduledEnd);
    }

    const updatedSession = await this.sessionRepository.save(session);

    return {
      message: 'Session updated successfully',
      session: updatedSession,
    };
  }

  async remove(id: number, userId: number) {
    const session = await this.findOne(id);

    // Check permissions (simplified)
    const course = await this.courseRepository.findOne({
      where: { id: session.courseId },
    });

    if (course && course.instructorId !== userId) {
      // Allow admins to delete any session
      // This would typically check user role
    }

    await this.sessionRepository.remove(session);

    return {
      message: 'Session deleted successfully',
    };
  }

  async updateBulkAttendance(sessionId: number, attendanceData: any) {
    const session = await this.findOne(sessionId);
    const { attendanceRecords } = attendanceData;

    if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
      throw new Error('Invalid attendance data');
    }

    // Update or create attendance records
    const updatedRecords = [];

    for (const record of attendanceRecords) {
      const { studentId, status, joinTime, leaveTime, notes } = record;

      let attendance = await this.attendanceRepository.findOne({
        where: { sessionId, studentId },
      });

      if (attendance) {
        // Update existing record
        attendance.status = status;
        attendance.joinTime = joinTime ? new Date(joinTime) : null;
        attendance.leaveTime = leaveTime ? new Date(leaveTime) : null;
        attendance.notes = notes;
      } else {
        // Create new record
        attendance = this.attendanceRepository.create({
          sessionId,
          studentId,
          status,
          joinTime: joinTime ? new Date(joinTime) : null,
          leaveTime: leaveTime ? new Date(leaveTime) : null,
          notes,
        });
      }

      const savedRecord = await this.attendanceRepository.save(attendance);
      updatedRecords.push(savedRecord);
    }

    return {
      message: 'Attendance updated successfully',
      attendanceRecords: updatedRecords,
    };
  }
}