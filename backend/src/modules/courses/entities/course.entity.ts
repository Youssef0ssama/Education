import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Enrollment } from '../../students/entities/enrollment.entity';
import { Assignment } from '../../assignments/entities/assignment.entity';
import { ClassSession } from '../../sessions/entities/class-session.entity';
import { Content } from '../../content/entities/content.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ default: 1 })
  durationWeeks: number;

  @Column({ default: 30 })
  maxStudents: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, length: 50 })
  difficultyLevel?: string;

  @Column('text', { array: true, default: '{}' })
  prerequisites: string[];

  @Column({ type: 'timestamp', nullable: true })
  enrollmentStartDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  enrollmentEndDate?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.instructedCourses)
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @Column()
  instructorId: number;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @OneToMany(() => Assignment, (assignment) => assignment.course)
  assignments: Assignment[];

  @OneToMany(() => ClassSession, (session) => session.course)
  sessions: ClassSession[];

  @OneToMany(() => Content, (content) => content.course)
  content: Content[];
}