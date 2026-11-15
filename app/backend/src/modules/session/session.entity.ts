import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('user_sessions')
export class UserSession extends BaseEntity {
  @Column()
  userId!: number;

  /** SHA-256 of the current refresh token. The token itself is never stored. */
  @Index({ unique: true })
  @Column({ length: 64 })
  tokenHash!: string;

  /** Hash of the previous refresh token: presenting it again means it was stolen/replayed. */
  @Column({ nullable: true, length: 64 })
  prevTokenHash?: string;

  @Column({ nullable: true, type: 'datetime' })
  lastUsedAt?: Date;

  /** When the refresh token was last rotated (set by the app, never by the DB clock). */
  @Column({ nullable: true, type: 'datetime' })
  rotatedAt?: Date;

  @Column({ nullable: true, length: 512 })
  userAgent?: string;

  @Column({ nullable: true, length: 45 })
  ipAddress?: string;

  @Column({ nullable: true, type: 'datetime' })
  expiresAt?: Date;
}
