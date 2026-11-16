import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity()
export class Webhook extends BaseEntity {
  @Column()
  url!: string;

  @Column()
  event!: string;

  @Column({ nullable: true })
  secret?: string;

  @Column({ default: true })
  active!: boolean;

  @Column({ type: 'json', nullable: true })
  config?: Record<string, any>;

  /** Scoping: set when this webhook belongs to a project */
  @Index('IDX_webhook_projectId')
  @Column({ nullable: true, type: 'int' })
  projectId?: number;

  /** Scoping: set for user-level (global) webhooks */
  @Index('IDX_webhook_userId')
  @Column({ nullable: true, type: 'int' })
  userId?: number;
}
