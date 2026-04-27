import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

@Entity('kanban_buckets')
export class KanbanBucket extends BaseEntity {
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
