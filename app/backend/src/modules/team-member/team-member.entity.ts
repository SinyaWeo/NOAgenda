import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';
import { Team } from '../team/team.entity';

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false })
  user!: User;

  @ManyToOne(() => Team, { nullable: false })
  team!: Team;
}
