import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('user_sessions')
export class UserSession extends BaseEntity {
  @Column()
  userId!: number;

  @Column({ type: 'text' })
  tokenHash!: string;

  @Column({ nullable: true, length: 512 })
  userAgent?: string;

  @Column({ nullable: true, length: 45 })
  ipAddress?: string;

  @Column({ nullable: true, type: 'datetime' })
  expiresAt?: Date;
}
