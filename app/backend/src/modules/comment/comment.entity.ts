import { Entity, Column, ManyToOne } from 'typeorm';
import { Node } from '../node/node.entity';
import { User } from '../user/user.entity';
import { BaseEntity } from '@common/base.entity';

@Entity('comments')
export class Comment extends BaseEntity {
  @Column()
  content!: string;

  @ManyToOne(() => Node, { nullable: false, onDelete: 'CASCADE' })
  node!: Node;

  @ManyToOne(() => User, { nullable: false })
  author!: User;
}
