import { Entity, Column, ManyToOne, ForeignKey } from 'typeorm';
import { User } from '../user/user.entity';
import { Node } from '../node/node.entity';
import { BaseEntity } from '@common/base.entity';

/** What happened. The UI turns a known type into a localized sentence; `message` is the English fallback. */
export type NotificationType =
  | 'task_assigned'
  | 'task_comment'
  | 'project_added'
  | 'project_transferred'
  | 'project_transferred_away'
  | 'task_reminder';

@Entity('notifications')
export class Notification extends BaseEntity {
  @Column()
  message!: string;

  @Column({ default: false })
  read!: boolean;

  @ManyToOne(() => User, { nullable: false })
  user!: User;

  /** Set for system-generated notifications; null for ones a user created through the API. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  type?: NotificationType | null;

  /** The task or project the notification is about (the UI links to it). Removed together with it. */
  @ForeignKey(() => Node, { name: 'FK_notifications_nodeId', onDelete: 'CASCADE' })
  @Column({ type: 'int', nullable: true })
  nodeId?: number | null;

  /** JSON: { actor, title, kind: 'task' | 'project' }, used to build the localized text. */
  @Column({ type: 'text', nullable: true })
  params?: string | null;
}
