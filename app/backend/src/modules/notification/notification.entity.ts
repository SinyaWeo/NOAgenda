import { Entity, Column, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';
import { BaseEntity } from '@common/base.entity';

@Entity('notifications')
export class Notification extends BaseEntity {
  @Column()
  message!: string;

  @Column({ default: false })
  read!: boolean;

  @ManyToOne(() => User, { nullable: false })
  user!: User;
}
