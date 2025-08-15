import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './entities/assignment.entity';
import { Submission } from './entities/submission.entity';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
  ) {}

  async findAll(): Promise<Assignment[]> {
    return this.assignmentRepository.find({
      relations: ['course', 'createdBy'],
    });
  }

  async findOne(id: number): Promise<Assignment> {
    return this.assignmentRepository.findOne({
      where: { id },
      relations: ['course', 'createdBy', 'submissions'],
    });
  }
}