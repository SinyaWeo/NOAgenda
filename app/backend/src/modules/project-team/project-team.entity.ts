import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Project } from '../project/project.entity';
import { Team } from '../team/team.entity';
import { Permission } from '../project-user/project-user.entity';

@Entity('project_teams')
export class ProjectTeam extends BaseEntity {
  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: false })
  project!: Project;

  @ManyToOne(() => Team, { onDelete: 'CASCADE', nullable: false })
  team!: Team;

  @Column({ type: 'enum', enum: Permission, default: Permission.READ })
  permission!: Permission;
}
