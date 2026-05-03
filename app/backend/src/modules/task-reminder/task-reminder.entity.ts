import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';

@Entity('task_reminders')
export class TaskReminder extends BaseEntity {
  @ManyToOne(() => Node, { onDelete: 'CASCADE', nullable: false })
  node!: Node;

  @Column({ type: 'datetime' })
  reminderDate!: Date;
}
