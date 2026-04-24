import { User } from '../user/user.entity';
import { Team } from '../team/team.entity';
export declare class TeamMember {
    id: number;
    user: User;
    team: Team;
}
