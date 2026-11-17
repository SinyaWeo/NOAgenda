import { Entity, Column, Index, ForeignKey } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';
import { User } from '../user/user.entity';

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

  /** Outcome of the latest delivery attempt: HTTP status, or null when it never got a response. */
  @Column({ type: 'int', nullable: true })
  lastStatus?: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastError?: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastDeliveryAt?: Date | null;

  /** Failed deliveries in a row; the webhook is switched off after too many. */
  @Column({ type: 'int', default: 0 })
  failureCount!: number;

  /** Scoping: set when this webhook belongs to a project */
  @ForeignKey(() => Node, { name: 'FK_webhook_projectId', onDelete: 'CASCADE' })
  @Index('IDX_webhook_projectId')
  @Column({ nullable: true, type: 'int' })
  projectId?: number;

  /** Scoping: set for user-level (global) webhooks */
  @ForeignKey(() => User, { name: 'FK_webhook_userId', onDelete: 'CASCADE' })
  @Index('IDX_webhook_userId')
  @Column({ nullable: true, type: 'int' })
  userId?: number;
}
