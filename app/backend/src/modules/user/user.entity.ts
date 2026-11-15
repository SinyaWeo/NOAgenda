import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { UserRole } from './user-role.enum';

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

  @Column({ nullable: true, length: 255 })
  name?: string;

  @Column({ nullable: true, length: 10, default: 'en' })
  language?: string;

  @Column({ nullable: true, length: 64, default: 'UTC' })
  timezone?: string;

  @Column({ nullable: true, length: 20, default: 'light' })
  theme?: string;

  @Column({ nullable: true, type: 'tinyint', default: 1 })
  weekStart?: number;

  @Column({ nullable: true, type: 'int' })
  defaultProjectId?: number;

  @Column({ nullable: true, length: 512 })
  avatarUrl?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  /** Consecutive failed logins; reset on success. Drives the account lockout. */
  @Column({ default: 0 })
  failedLoginAttempts!: number;

  @Column({ nullable: true, type: 'datetime' })
  lockedUntil?: Date;

  @Column({ default: false })
  isDeletionRequested!: boolean;

  @Column({ nullable: true, type: 'datetime' })
  deletionScheduledAt?: Date;
}
