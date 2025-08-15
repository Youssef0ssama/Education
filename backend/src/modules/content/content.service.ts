import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from './entities/content.entity';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
  ) {}

  async findAll(): Promise<Content[]> {
    return this.contentRepository.find({
      relations: ['course'],
      order: { orderIndex: 'ASC' },
    });
  }

  async findByCourse(courseId: number): Promise<Content[]> {
    return this.contentRepository.find({
      where: { courseId },
      order: { orderIndex: 'ASC' },
    });
  }
}