import { Entity, Column, ManyToOne } from 'typeorm';
import { Task } from '../task/task.entity';
import { User } from '../user/user.entity';
import { BaseEntity } from '@common/base.entity';

@Entity('comments')
export class Comment extends BaseEntity {
  @Column()
  content!: string;

  @ManyToOne(() => Task, { nullable: false })
  task!: Task;

  @ManyToOne(() => User, { nullable: false })
  author!: User;
}
