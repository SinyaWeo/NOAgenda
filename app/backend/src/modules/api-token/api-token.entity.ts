import { Entity, Column, ForeignKey } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { User } from '../user/user.entity';

@Entity('api_tokens')
export class ApiToken extends BaseEntity {
  @ForeignKey(() => User, { name: 'FK_api_tokens_userId', onDelete: 'CASCADE' })
  @Column()
  userId!: number;

  @Column()
  name!: string;

  /** SHA-256 of the raw token (the raw value is shown once, at creation). */
  @Column({ unique: true })
  token!: string;

  /** First characters of the raw token, so users can tell tokens apart. */
  @Column({ nullable: true, length: 16 })
  tokenPrefix?: string;

  /** 'read' = GET only; 'write' = full rights of the owner (except admin routes, never reachable with a token). */
  @Column({ type: 'varchar', length: 10, default: 'write' })
  scope!: 'read' | 'write';

  @Column({ nullable: true, type: 'datetime' })
  expiresAt?: Date;

  @Column({ nullable: true, type: 'datetime' })
  lastUsedAt?: Date;
}
