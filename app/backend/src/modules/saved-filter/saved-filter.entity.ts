import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('saved_filters')
export class SavedFilter extends BaseEntity {
  @Column()
  name!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'json', nullable: true })
  filters?: Record<string, any>;

  @Column()
  userId!: number;
}
