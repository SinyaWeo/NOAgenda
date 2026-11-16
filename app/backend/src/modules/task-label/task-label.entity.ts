import { Entity, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';
import { Label } from '../label/label.entity';

@Index('UQ_task_labels_node_label', ['node', 'label'], { unique: true })
@Entity('task_labels')
export class TaskLabel extends BaseEntity {
  @ManyToOne(() => Node, { onDelete: 'CASCADE', nullable: false })
  node!: Node;

  @ManyToOne(() => Label, { onDelete: 'CASCADE', nullable: false })
  label!: Label;
}
