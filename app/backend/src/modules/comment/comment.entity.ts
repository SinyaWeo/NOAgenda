import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Task } from '../task/task.entity';
import { User } from '../user/user.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  content!: string;

  @ManyToOne(() => Task, { nullable: false })
  task!: Task;

  @ManyToOne(() => User, { nullable: false })
  author!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
