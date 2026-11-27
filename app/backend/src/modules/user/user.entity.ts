import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { encryptedColumn } from '@common/secret-box';
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

  @Column({ nullable: true, length: 512 })
  avatarUrl?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  /** When the user accepted the Terms of Service / Privacy Policy at sign-up. */
  @Column({ nullable: true, type: 'datetime' })
  termsAcceptedAt?: Date;

  /** When an admin created the account and last sent its activation invite; null for self-registered users. */
  @Column({ nullable: true, type: 'datetime' })
  invitedAt?: Date | null;

  /** Consecutive failed logins; reset on success. Drives the account lockout. */
  @Column({ default: 0 })
  failedLoginAttempts!: number;

  @Column({ nullable: true, type: 'datetime' })
  lockedUntil?: Date | null;

  /** Set by an admin: the account cannot sign in and all its sessions and API tokens stop working. */
  @Column({ default: false })
  isLocked!: boolean;

  @Column({ default: false })
  isDeletionRequested!: boolean;

  @Column({ nullable: true, type: 'datetime' })
  deletionScheduledAt?: Date;

  /**
   * Two-factor authentication (modules/mfa). The authenticator secret is encrypted at rest and, like the
   * replay counter and the recovery-code hashes, never selected unless MfaService asks for it.
   */
  @Column({ type: 'text', nullable: true, select: false, transformer: encryptedColumn('users.totpSecret') })
  totpSecret?: string | null;

  /** When 2FA was switched on; null = off (a secret without this is a setup not confirmed yet). */
  @Column({ nullable: true, type: 'datetime' })
  totpEnabledAt?: Date | null;

  /** The last time step whose code was accepted: a code is good once only. */
  @Column({ nullable: true, type: 'int', select: false })
  totpLastStep?: number | null;

  /** Keyed hashes (HMAC with a key from SECRETS_KEY, see SecretBox.mac) of the unused recovery codes, as a JSON array. */
  @Column({ nullable: true, type: 'text', select: false })
  totpRecoveryCodes?: string | null;
}
