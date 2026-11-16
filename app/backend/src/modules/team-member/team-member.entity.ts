import { Entity, ManyToOne, Index } from 'typeorm';
import { User } from '../user/user.entity';
import { Team } from '../team/team.entity';
import { BaseEntity } from '@common/base.entity';

@Index('UQ_team_members_team_user', ['team', 'user'], { unique: true })
@Entity('team_members')
export class TeamMember extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Team, { nullable: false, onDelete: 'CASCADE' })
  team!: Team;
}
