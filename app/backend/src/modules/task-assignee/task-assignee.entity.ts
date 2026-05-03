import { Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';
import { User } from '../user/user.entity';

@Entity('task_assignees')
export class TaskAssignee extends BaseEntity {
  @ManyToOne(() => Node, { onDelete: 'CASCADE', nullable: false })
  node!: Node;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user!: User;
}
