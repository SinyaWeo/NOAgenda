import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './team.entity';
import { TeamMember } from '../team-member/team-member.entity';
import { User } from '../user/user.entity';

export type UserSummary = Pick<User, 'id' | 'username' | 'name' | 'avatarUrl'>;

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly memberRepository: Repository<TeamMember>,
  ) {}

  /** True when `userId` is `ownerId` themselves or a member of a team `ownerId` owns. */
  async isOwnerOrOwnedTeamMember(ownerId: number, userId: number): Promise<boolean> {
    if (ownerId === userId) return true;
    return this.memberRepository.exists({ where: { user: { id: userId }, team: { ownerId } } });
  }

  /** Members of the teams `ownerId` owns (the people they may assign tasks to, besides themselves). */
  async findAssignableUsers(ownerId: number): Promise<UserSummary[]> {
    const members = await this.memberRepository.find({
      where: { team: { ownerId } },
      relations: { user: true },
    });
    const byId = new Map<number, UserSummary>();
    for (const { user } of members) {
      if (user) byId.set(user.id, { id: user.id, username: user.username, name: user.name, avatarUrl: user.avatarUrl });
    }
    return [...byId.values()];
  }

  async findAll(userId: number): Promise<Team[]> {
    // Return teams the user owns or is a member of
    return this.teamRepository
      .createQueryBuilder('team')
      .leftJoin('team_members', 'tm', 'tm.teamId = team.id AND tm.userId = :userId', { userId })
      .where('(team.ownerId = :userId OR tm.userId = :userId)', { userId })
      .getMany();
  }

  async findById(id: number): Promise<Team | null> {
    return this.teamRepository.findOne({ where: { id } });
  }

  async create(team: Partial<Team>): Promise<Team> {
    const newTeam = this.teamRepository.create(team);
    return this.teamRepository.save(newTeam);
  }

  async update(id: number, data: Partial<Team>): Promise<Team | null> {
    await this.teamRepository.update(id, data);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.teamRepository.delete(id);
  }
}
