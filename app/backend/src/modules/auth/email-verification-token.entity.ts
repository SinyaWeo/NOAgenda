import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { User } from '../user/user.entity';

/** One-time token proving ownership of an email address. Only the hash is stored. */
@Entity('email_verification_tokens')
export class EmailVerificationToken extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 64 })
  tokenHash!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user!: User;

  /** The address being verified (the user's email at the time of issue). */
  @Column()
  email!: string;

  @Column()
  expiresAt!: Date;
}
