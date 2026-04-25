import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Project } from '../project/project.entity';
import { User } from '../user/user.entity';

export enum Permission {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
}

@Entity('project_users')
export class ProjectUser extends BaseEntity {
  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: false })
  project!: Project;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user!: User;

  @Column({ type: 'enum', enum: Permission, default: Permission.READ })
  permission!: Permission;
}
