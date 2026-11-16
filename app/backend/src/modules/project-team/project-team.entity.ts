import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';
import { Team } from '../team/team.entity';
import { Permission } from '../project-user/project-user.entity';

@Index('UQ_project_teams_project_team', ['project', 'team'], { unique: true })
@Entity('project_teams')
export class ProjectTeam extends BaseEntity {
  @ManyToOne(() => Node, { onDelete: 'CASCADE', nullable: false })
  project!: Node;

  @ManyToOne(() => Team, { onDelete: 'CASCADE', nullable: false })
  team!: Team;

  @Column({ type: 'enum', enum: Permission, default: Permission.READ })
  permission!: Permission;
}
