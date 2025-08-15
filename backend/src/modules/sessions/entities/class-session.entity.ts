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
import { Course } from '../../courses/entities/course.entity';
import { Attendance } from './attendance.entity';

@Entity('class_sessions')
export class ClassSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ type: 'timestamp' })
  scheduledStart: Date;

  @Column({ type: 'timestamp' })
  scheduledEnd: Date;

  @Column({ length: 100, nullable: true })
  zoomMeetingId?: string;

  @Column({ length: 500, nullable: true })
  zoomJoinUrl?: string;

  @Column({ length: 100, nullable: true })
  zoomPassword?: string;

  @Column({ length: 50, default: 'scheduled' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Course, (course) => course.sessions)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  courseId: number;

  @OneToMany(() => Attendance, (attendance) => attendance.session)
  attendanceRecords: Attendance[];
}