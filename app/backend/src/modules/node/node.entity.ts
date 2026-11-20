import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index, ForeignKey } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { User } from '../user/user.entity';
import { KanbanBucket } from '../kanban-bucket/kanban-bucket.entity';

export enum NodeType {
  PROJECT = 'project',
  TASK = 'task',
}

export enum NodeStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum RepeatMode {
  DEFAULT = 'default',
  MONTHLY = 'monthly',
  FROM_CURRENT_DATE = 'from_current_date',
  /** Every N weeks on the weekdays in `repeatWeekdays` (the due date's weekday when none are given). */
  WEEKLY = 'weekly',
  /** Every N months on the same weekday position as the due date ("second Tuesday", "last Friday"). */
  MONTHLY_WEEKDAY = 'monthly_weekday',
  /** Every N months on the last day of the month. */
  MONTH_END = 'month_end',
}

@Entity('nodes')
export class Node extends BaseEntity {
  @Column({ type: 'enum', enum: NodeType })
  type!: NodeType;

  // Project fields
  @Column({ nullable: true })
  name?: string;

  @Column({ default: false })
  isArchived!: boolean;

  @ForeignKey(() => User, { name: 'FK_nodes_ownerId', onDelete: 'SET NULL' })
  @Index('IDX_nodes_ownerId')
  @Column({ nullable: true, type: 'int' })
  ownerId?: number;

  // Task fields
  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'enum', enum: NodeStatus, nullable: true })
  status?: NodeStatus;

  @Column({ nullable: true, type: 'datetime' })
  dueDate?: Date;

  @Column({ nullable: true, type: 'int' })
  priority?: number;

  @Column({ nullable: true, type: 'double' })
  position?: number;

  @Column({ type: 'enum', enum: RepeatMode, nullable: true })
  repeatMode?: RepeatMode;

  @Column({ nullable: true, type: 'int' })
  repeatAfter?: number;

  /** WEEKLY: comma-separated ISO weekdays (1 = Monday ... 7 = Sunday), e.g. "1,3,5". */
  @Column({ type: 'varchar', length: 13, nullable: true })
  repeatWeekdays?: string | null;

  /** The series ends with the last occurrence due on this day (inclusive). */
  @Column({ nullable: true, type: 'datetime' })
  repeatUntil?: Date | null;

  /** Occurrences left, this one included; the series ends when completing the last. Null = no limit. */
  @Column({ nullable: true, type: 'int' })
  repeatCount?: number | null;

  @Column({ nullable: true, type: 'datetime' })
  startDate?: Date;

  @Column({ nullable: true, type: 'int', default: 0 })
  percentDone?: number;

  @ForeignKey(() => User, { name: 'FK_nodes_createdBy', onDelete: 'SET NULL' })
  @Index('IDX_nodes_createdBy')
  @Column({ nullable: true, type: 'int' })
  createdBy?: number;

  @ForeignKey(() => KanbanBucket, { name: 'FK_nodes_bucketId', onDelete: 'SET NULL' })
  @Column({ nullable: true, type: 'int' })
  bucketId?: number;

  // Self-referencing parent-child
  @Column({ nullable: true, type: 'int' })
  parentId?: number | null;

  @ManyToOne(() => Node, (node) => node.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: Node;

  @OneToMany(() => Node, (node) => node.parent)
  children?: Node[];

  /** Convenience: returns name (projects) or title (tasks) */
  get displayName(): string {
    return this.name ?? this.title ?? '';
  }
}
