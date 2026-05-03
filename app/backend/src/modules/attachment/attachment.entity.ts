import { Entity, Column, ManyToOne } from 'typeorm';
import { Node } from '../node/node.entity';
import { User } from '../user/user.entity';
import { BaseEntity } from '@common/base.entity';

@Entity('attachments')
export class Attachment extends BaseEntity {
  @Column()
  filename!: string;

  @Column()
  path!: string;

  @ManyToOne(() => Node, { nullable: false, onDelete: 'CASCADE' })
  node!: Node;

  @ManyToOne(() => User, { nullable: false })
  uploader!: User;
}
