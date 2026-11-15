import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('api_tokens')
export class ApiToken extends BaseEntity {
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

  @Column({ nullable: true, type: 'datetime' })
  expiresAt?: Date;

  @Column({ nullable: true, type: 'datetime' })
  lastUsedAt?: Date;
}
