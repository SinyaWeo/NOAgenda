import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';

export enum RelationKind {
  SUBTASK = 'subtask',
  BLOCKS = 'blocks',
  BLOCKED_BY = 'blocked_by',
  RELATED = 'related',
  DUPLICATE_OF = 'duplicate_of',
  DUPLICATED_BY = 'duplicated_by',
}

@Index('UQ_task_relations_pair_kind', ['node', 'relatedNode', 'kind'], { unique: true })
@Entity('task_relations')
export class TaskRelation extends BaseEntity {
  @ManyToOne(() => Node, { onDelete: 'CASCADE', nullable: false })
  node!: Node;

  @ManyToOne(() => Node, { onDelete: 'CASCADE', nullable: false })
  relatedNode!: Node;

  @Column({ type: 'enum', enum: RelationKind })
  kind!: RelationKind;
}
