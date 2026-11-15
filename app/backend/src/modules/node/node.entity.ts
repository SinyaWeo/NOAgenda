import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@common/base.entity';

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

  @Column({ nullable: true, type: 'datetime' })
  startDate?: Date;

  @Column({ nullable: true, type: 'int', default: 0 })
  percentDone?: number;

  @Column({ nullable: true, type: 'int' })
  createdBy?: number;

  @Column({ nullable: true, type: 'int' })
  bucketId?: number;

  // Self-referencing parent-child
  @Column({ nullable: true, type: 'int' })
  parentId?: number;

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
