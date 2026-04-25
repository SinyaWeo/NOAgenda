import { Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Task } from '../task/task.entity';
import { Label } from '../label/label.entity';

@Entity('task_labels')
export class TaskLabel extends BaseEntity {
  @ManyToOne(() => Task, { onDelete: 'CASCADE', nullable: false })
  task!: Task;

  @ManyToOne(() => Label, { onDelete: 'CASCADE', nullable: false })
  label!: Label;
}
