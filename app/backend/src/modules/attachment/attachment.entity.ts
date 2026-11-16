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

  /** Bytes on disk (0 for files uploaded before sizes were recorded). Counts toward the uploader's quota. */
  @Column({ type: 'int', unsigned: true, default: 0 })
  size!: number;

  @ManyToOne(() => Node, { nullable: false, onDelete: 'CASCADE' })
  node!: Node;

  @ManyToOne(() => User, { nullable: false })
  uploader!: User;
}
