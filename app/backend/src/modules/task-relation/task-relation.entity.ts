import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Task } from '../task/task.entity';

export enum RelationKind {
  SUBTASK = 'subtask',
  BLOCKS = 'blocks',
  BLOCKED_BY = 'blocked_by',
  RELATED = 'related',
  DUPLICATE_OF = 'duplicate_of',
  DUPLICATED_BY = 'duplicated_by',
}

@Entity('task_relations')
export class TaskRelation extends BaseEntity {
  @ManyToOne(() => Task, { onDelete: 'CASCADE', nullable: false })
  task!: Task;

  @ManyToOne(() => Task, { onDelete: 'CASCADE', nullable: false })
  relatedTask!: Task;

  @Column({ type: 'enum', enum: RelationKind })
  kind!: RelationKind;
}
