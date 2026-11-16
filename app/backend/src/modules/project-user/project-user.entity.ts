import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';
import { User } from '../user/user.entity';

export enum Permission {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
}

@Index('UQ_project_users_project_user', ['project', 'user'], { unique: true })
@Entity('project_users')
export class ProjectUser extends BaseEntity {
  @ManyToOne(() => Node, { onDelete: 'CASCADE', nullable: false })
  project!: Node;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user!: User;

  @Column({ type: 'enum', enum: Permission, default: Permission.READ })
  permission!: Permission;
}
