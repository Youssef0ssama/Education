import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity';

@Entity('content')
export class Content {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ length: 50, default: 'text' })
  contentType: string; // text, video, pdf, link, etc.

  @Column({ length: 500, nullable: true })
  fileUrl?: string;

  @Column({ nullable: true })
  durationMinutes?: number;

  @Column({ default: 0 })
  orderIndex: number;

  @Column({ default: false })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Course, (course) => course.content)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  courseId: number;
}