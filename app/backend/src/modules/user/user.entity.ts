import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { UserRole } from './user-role.enum';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  // select:false keeps the hash out of every query and eager/joined relation
  // (comment.author, attachment.uploader, ...). UserService loads it explicitly.
  @Column({ select: false })
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

  @Column({ nullable: true, type: 'int' })
  defaultProjectId?: number | null;

  @Column({ nullable: true, length: 512 })
  avatarUrl?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  /** When the user accepted the Terms of Service / Privacy Policy at sign-up. */
  @Column({ nullable: true, type: 'datetime' })
  termsAcceptedAt?: Date;

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
