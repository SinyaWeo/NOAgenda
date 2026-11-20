import { Entity, Column, ManyToOne, ForeignKey, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';
import { User } from '../user/user.entity';

/** One completion of a repeating task. The task itself reopens, so this is the only record of past cycles. */
@Entity('task_completions')
@Index('IDX_task_completions_node', ['node', 'completedAt'])
export class TaskCompletion extends BaseEntity {
  @ManyToOne(() => Node, { onDelete: 'CASCADE', nullable: false })
  node!: Node;

  @Column({ type: 'datetime' })
  completedAt!: Date;

  /** Who ticked it off; null once that user is gone. */
  @ForeignKey(() => User, { name: 'FK_task_completions_completedBy', onDelete: 'SET NULL' })
  @Column({ type: 'int', nullable: true })
  completedBy?: number | null;

  /** The due date this cycle was completed for (null if the task had none). */
  @Column({ type: 'datetime', nullable: true })
  dueDate?: Date | null;
}
