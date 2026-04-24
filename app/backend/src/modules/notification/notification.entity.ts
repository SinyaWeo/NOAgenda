import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  message!: string;

  @Column({ default: false })
  read!: boolean;

  @ManyToOne(() => User, { nullable: false })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
