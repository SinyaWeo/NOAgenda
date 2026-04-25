import { Entity, Column, ManyToOne } from 'typeorm';
import { Project } from '../project/project.entity';
import { BaseEntity } from '@common/base.entity';

export enum TaskStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum RepeatMode {
  DEFAULT = 'default',
  MONTHLY = 'monthly',
  FROM_CURRENT_DATE = 'from_current_date',
}

@Entity('tasks')
export class Task extends BaseEntity {
  @Column()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.OPEN })
  status!: TaskStatus;

  @Column({ nullable: true, type: 'datetime' })
  dueDate?: Date;

  @Column({ nullable: true, type: 'int' })
  priority?: number;

  @Column({ nullable: true, type: 'double' })
  position?: number;

  @Column({ type: 'enum', enum: RepeatMode, nullable: true })
  repeatMode?: RepeatMode;

  @Column({ nullable: true, type: 'int' })
  repeatAfter?: number;

  @ManyToOne(() => Project, { nullable: false })
  project!: Project;
}

