import { Entity, Column, ManyToOne } from 'typeorm';
import { Task } from '../task/task.entity';
import { User } from '../user/user.entity';
import { BaseEntity } from '@common/base.entity';

@Entity('attachments')
export class Attachment extends BaseEntity {
  @Column()
  filename!: string;

  @Column()
  path!: string;

  @ManyToOne(() => Task, { nullable: false })
  task!: Task;

  @ManyToOne(() => User, { nullable: false })
  uploader!: User;
}
