import { Repository } from 'typeorm';
import { TeamMember } from './team-member.entity';
export declare class TeamMemberService {
    private readonly teamMemberRepository;
    constructor(teamMemberRepository: Repository<TeamMember>);
    findAll(): Promise<TeamMember[]>;
    add(user: any, team: any): Promise<TeamMember>;
    remove(id: number): Promise<void>;
}
