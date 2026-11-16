import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('kanban_buckets')
export class KanbanBucket extends BaseEntity {
  @Index('IDX_kanban_buckets_projectId')
  @Column()
  projectId!: number;

  @Column()
  viewId!: number;

  @Column()
  title!: string;

  @Column({ default: 0 })
  position!: number;

  @Column({ nullable: true, type: 'int' })
  limit?: number;
}
