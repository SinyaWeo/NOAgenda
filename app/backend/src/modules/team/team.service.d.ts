import { Repository } from 'typeorm';
import { Team } from './team.entity';
export declare class TeamService {
    private readonly teamRepository;
    constructor(teamRepository: Repository<Team>);
    findAll(): Promise<Team[]>;
    findById(id: number): Promise<Team | null>;
    create(team: Partial<Team>): Promise<Team>;
}
