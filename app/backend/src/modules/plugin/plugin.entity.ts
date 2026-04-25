import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity()
export class Plugin extends BaseEntity {
  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ type: 'json', nullable: true })
  config?: Record<string, any>;
}
