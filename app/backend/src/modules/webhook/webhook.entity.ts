import { Entity, Column } from 'typeorm';
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
}
