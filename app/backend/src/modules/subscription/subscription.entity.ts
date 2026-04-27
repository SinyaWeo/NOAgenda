import { Entity, Column, Unique } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

export type SubscriptionEntityType = 'project' | 'task';

@Entity('subscriptions')
@Unique(['userId', 'entityType', 'entityId'])
export class Subscription extends BaseEntity {
  @Column()
  userId!: number;

  @Column()
  entityType!: SubscriptionEntityType;

  @Column()
  entityId!: number;
}
