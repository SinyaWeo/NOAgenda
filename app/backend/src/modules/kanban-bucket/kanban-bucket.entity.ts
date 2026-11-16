import { Entity, Column, Index, ForeignKey } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';
import { ProjectView } from '../project-view/project-view.entity';

@Entity('kanban_buckets')
export class KanbanBucket extends BaseEntity {
  @ForeignKey(() => Node, { name: 'FK_kanban_buckets_projectId', onDelete: 'CASCADE' })
  @Index('IDX_kanban_buckets_projectId')
  @Column()
  projectId!: number;

  @ForeignKey(() => ProjectView, { name: 'FK_kanban_buckets_viewId', onDelete: 'CASCADE' })
  @Column()
  viewId!: number;

  @Column()
  title!: string;

  @Column({ default: 0 })
  position!: number;

  @Column({ nullable: true, type: 'int' })
  limit?: number;
}
