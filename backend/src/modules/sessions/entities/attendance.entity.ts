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
import { ClassSession } from './class-session.entity';

@Entity('attendance')
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, default: 'absent' })
  status: string; // present, absent, late, excused

  @Column({ type: 'timestamp', nullable: true })
  joinTime?: Date;

  @Column({ type: 'timestamp', nullable: true })
  leaveTime?: Date;

  @Column('text', { nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ClassSession, (session) => session.attendanceRecords)
  @JoinColumn({ name: 'sessionId' })
  session: ClassSession;

  @Column()
  sessionId: number;

  @ManyToOne(() => User, (user) => user.attendanceRecords)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column()
  studentId: number;
}