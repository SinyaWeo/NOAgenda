import { Entity, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';
import { User } from '../user/user.entity';

@Index('UQ_task_assignees_node_user', ['node', 'user'], { unique: true })
@Entity('task_assignees')
export class TaskAssignee extends BaseEntity {
  @ManyToOne(() => Node, { onDelete: 'CASCADE', nullable: false })
  node!: Node;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user!: User;
}
