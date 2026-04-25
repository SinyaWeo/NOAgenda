import { Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Task } from '../task/task.entity';
import { User } from '../user/user.entity';

@Entity('task_assignees')
export class TaskAssignee extends BaseEntity {
  @ManyToOne(() => Task, { onDelete: 'CASCADE', nullable: false })
  task!: Task;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user!: User;
}
