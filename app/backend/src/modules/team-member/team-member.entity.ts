import { Entity, ManyToOne, Index, Column } from 'typeorm';
import { User } from '../user/user.entity';
import { Team } from '../team/team.entity';
import { BaseEntity } from '@common/base.entity';

/** A member's role inside one team. Only the app admin can change who is a manager. */
export enum TeamRole {
  MEMBER = 'member',
  MANAGER = 'manager',
}

@Index('UQ_team_members_team_user', ['team', 'user'], { unique: true })
@Entity('team_members')
export class TeamMember extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Team, { nullable: false, onDelete: 'CASCADE' })
  team!: Team;

  @Column({ type: 'enum', enum: TeamRole, default: TeamRole.MEMBER })
  role!: TeamRole;
}
