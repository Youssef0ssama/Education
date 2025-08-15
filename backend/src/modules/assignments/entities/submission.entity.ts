import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Assignment } from './assignment.entity';

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { nullable: true })
  submissionText?: string;

  @Column({ length: 500, nullable: true })
  fileUrl?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  grade?: number;

  @Column('text', { nullable: true })
  feedback?: string;

  @Column({ type: 'timestamp', nullable: true })
  gradedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Assignment, (assignment) => assignment.submissions)
  @JoinColumn({ name: 'assignmentId' })
  assignment: Assignment;

  @Column()
  assignmentId: number;

  @ManyToOne(() => User, (user) => user.submissions)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column()
  studentId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'gradedById' })
  gradedBy?: User;

  @Column({ nullable: true })
  gradedById?: number;
}