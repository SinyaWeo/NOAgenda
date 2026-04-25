import { Entity, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';
import { Team } from '../team/team.entity';
import { BaseEntity } from '@common/base.entity';

@Entity('team_members')
export class TeamMember extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  user!: User;

  @ManyToOne(() => Team, { nullable: false })
  team!: Team;
}
