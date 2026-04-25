import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ default: false })
  isEmailConfirmed!: boolean;
}
