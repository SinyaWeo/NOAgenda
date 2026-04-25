import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Task } from '../task/task.entity';

@Entity('task_reminders')
export class TaskReminder extends BaseEntity {
  @ManyToOne(() => Task, { onDelete: 'CASCADE', nullable: false })
  task!: Task;

  @Column({ type: 'datetime' })
  reminderDate!: Date;
}
