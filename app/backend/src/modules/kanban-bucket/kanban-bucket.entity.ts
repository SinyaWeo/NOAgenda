import { Entity, Column, Index, ForeignKey } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';
import type { NodeStatus } from '../node/node.entity';

/**
 * A Kanban column of one project. Every bucket stands for a task status: a task placed in it takes
 * that status, and a project always keeps at least one bucket per status.
 */
@Entity('kanban_buckets')
export class KanbanBucket extends BaseEntity {
  @ForeignKey(() => Node, { name: 'FK_kanban_buckets_projectId', onDelete: 'CASCADE' })
  @Index('IDX_kanban_buckets_projectId')
  @Column()
  projectId!: number;

  @Column()
  title!: string;

  // NodeStatus values, spelled out: node.entity imports this file, so its runtime enum is not loaded yet here.
  @Column({ type: 'enum', enum: ['open', 'in_progress', 'done'], default: 'open' })
  status!: NodeStatus;

  @Column({ default: 0 })
  position!: number;

  @Column({ nullable: true, type: 'int' })
  limit?: number | null;
}
