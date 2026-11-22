import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

/**
 * One line of the audit trail. There are deliberately no foreign keys: an entry must outlive the
 * task, project or user it is about, so it keeps its own snapshot of their names.
 */
@Entity('activities')
@Index('IDX_activities_node', ['nodeId', 'id'])
@Index('IDX_activities_project', ['projectId', 'id'])
@Index('IDX_activities_owner', ['ownerId', 'id'])
@Index('IDX_activities_actor', ['actorId', 'id'])
@Index('IDX_activities_createdAt', ['createdAt'])
export class Activity extends BaseEntity {
  @Column({ type: 'int' })
  nodeId!: number;

  /** The project the node belonged to, or null for a personal task. */
  @Column({ type: 'int', nullable: true })
  projectId!: number | null;

  @Column({ type: 'int', nullable: true })
  actorId!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  actorName!: string | null;

  /** The project's owner (or a personal task's creator): who may still read the entry once the project is gone. */
  @Column({ type: 'int', nullable: true })
  ownerId!: number | null;

  @Column({ type: 'varchar', length: 20 })
  nodeType!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nodeTitle!: string | null;

  /** 'task.updated', 'project.deleted', 'comment.created', ... */
  @Column({ type: 'varchar', length: 50 })
  action!: string;

  @Column({ type: 'json', nullable: true })
  changes!: Record<string, unknown> | null;
}
