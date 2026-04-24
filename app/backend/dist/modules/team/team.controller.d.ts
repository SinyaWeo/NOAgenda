import { TeamService } from './team.service';
import { Team } from './team.entity';
export declare class TeamController {
    private readonly teamService;
    constructor(teamService: TeamService);
    findAll(): Promise<Team[]>;
    findById(id: number): Promise<Team | null>;
    create(body: Partial<Team>): Promise<Team>;
}
