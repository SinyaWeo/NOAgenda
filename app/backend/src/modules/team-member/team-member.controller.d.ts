import { TeamMemberService } from './team-member.service';
import { TeamMember } from './team-member.entity';
export declare class TeamMemberController {
    private readonly teamMemberService;
    constructor(teamMemberService: TeamMemberService);
    findAll(): Promise<TeamMember[]>;
    add(body: {
        user: any;
        team: any;
    }): Promise<TeamMember>;
    remove(id: number): Promise<void>;
}
