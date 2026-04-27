import { Entity, Column, Unique } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('reactions')
@Unique(['userId', 'entityType', 'entityId', 'reaction'])
export class Reaction extends BaseEntity {
  @Column()
  userId!: number;

  @Column()
  entityType!: string;

  @Column()
  entityId!: number;

  @Column({ length: 100 })
  reaction!: string;
}
