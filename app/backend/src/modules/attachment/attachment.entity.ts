import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Task } from '../task/task.entity';
import { User } from '../user/user.entity';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  filename!: string;

  @Column()
  path!: string;

  @ManyToOne(() => Task, { nullable: false })
  task!: Task;

  @ManyToOne(() => User, { nullable: false })
  uploader!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
