import { Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';
import { Label } from '../label/label.entity';

@Entity('task_labels')
export class TaskLabel extends BaseEntity {
  @ManyToOne(() => Node, { onDelete: 'CASCADE', nullable: false })
  node!: Node;

  @ManyToOne(() => Label, { onDelete: 'CASCADE', nullable: false })
  label!: Label;
}
