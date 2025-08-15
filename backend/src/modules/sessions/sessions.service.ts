import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSession } from './entities/class-session.entity';
import { Attendance } from './entities/attendance.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(ClassSession)
    private readonly sessionRepository: Repository<ClassSession>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
  ) {}

  async findAll(): Promise<ClassSession[]> {
    return this.sessionRepository.find({
      relations: ['course', 'attendanceRecords'],
    });
  }

  async findOne(id: number): Promise<ClassSession> {
    return this.sessionRepository.findOne({
      where: { id },
      relations: ['course', 'attendanceRecords', 'attendanceRecords.student'],
    });
  }
}