import { Entity, Column, ManyToOne, ForeignKey, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';
import { User } from '../user/user.entity';

@Entity('task_reminders')
@Index('IDX_task_reminders_pending', ['sentAt', 'reminderDate'])
export class TaskReminder extends BaseEntity {
  @ManyToOne(() => Node, { onDelete: 'CASCADE', nullable: false })
  node!: Node;

  @Column({ type: 'datetime' })
  reminderDate!: Date;

  /** Who set it, and so who is reminded. Null (older reminders): the task's creator and assignees. */
  @ForeignKey(() => User, { name: 'FK_task_reminders_createdBy', onDelete: 'CASCADE' })
  @Column({ type: 'int', nullable: true })
  createdBy?: number | null;

  /**
   * A reminder relative to the task's due date: this many days before it, at `atTime` ("HH:MM") in
   * the creator's time zone. `reminderDate` is recalculated whenever the due date changes. Both null:
   * a reminder at a fixed date.
   */
  @Column({ type: 'int', nullable: true })
  daysBefore?: number | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  atTime?: string | null;

  /** When the notification went out; null while it is still pending. */
  @Column({ type: 'datetime', nullable: true })
  sentAt?: Date | null;
}
