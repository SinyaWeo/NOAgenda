import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './team.entity';
import { TeamMember, TeamRole } from '../team-member/team-member.entity';
import { User } from '../user/user.entity';

export type UserSummary = Pick<User, 'id' | 'username' | 'name' | 'avatarUrl'>;

export interface AdminTeam extends Team {
  members: { id: number; role: TeamRole; user: UserSummary }[];
}

const summary = (user: User): UserSummary => ({
  id: user.id,
  username: user.username,
  name: user.name,
  avatarUrl: user.avatarUrl,
});

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly memberRepository: Repository<TeamMember>,
  ) {}

  /** Members of the teams `managerId` manages (the people they may assign tasks to). */
  private async managedMembers(managerId: number): Promise<TeamMember[]> {
    return this.memberRepository
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.user', 'user')
      .innerJoin('team_members', 'mgr', 'mgr.teamId = m.teamId AND mgr.userId = :managerId AND mgr.role = :role', {
        managerId,
        role: TeamRole.MANAGER,
      })
      .getMany();
  }

  /** True when `userId` is `callerId` themselves or a member of a team `callerId` manages. */
  async isSelfOrManagedTeamMember(callerId: number, userId: number): Promise<boolean> {
    if (callerId === userId) return true;
    return this.memberRepository
      .createQueryBuilder('m')
      .innerJoin('team_members', 'mgr', 'mgr.teamId = m.teamId AND mgr.userId = :callerId AND mgr.role = :role', {
        callerId,
        role: TeamRole.MANAGER,
      })
      .where('m.userId = :userId', { userId })
      .getExists();
  }

  /** Members of the teams `managerId` manages (the people they may assign tasks to, besides themselves). */
  async findAssignableUsers(managerId: number): Promise<UserSummary[]> {
    const byId = new Map<number, UserSummary>();
    for (const { user } of await this.managedMembers(managerId)) {
      if (user && user.id !== managerId) byId.set(user.id, summary(user));
    }
    return [...byId.values()];
  }

  /** Teams the user is a member of (managers included). */
  async findAll(userId: number): Promise<Team[]> {
    return this.teamRepository
      .createQueryBuilder('team')
      .innerJoin('team_members', 'tm', 'tm.teamId = team.id AND tm.userId = :userId', { userId })
      .getMany();
  }

  /** Every team with its members, for the app admin. */
  async findAllWithMembers(): Promise<AdminTeam[]> {
    const [teams, members] = await Promise.all([
      this.teamRepository.find({ order: { name: 'ASC' } }),
      this.memberRepository.find({ relations: { user: true, team: true }, order: { id: 'ASC' } }),
    ]);
    return teams.map((team) => ({
      ...team,
      members: members
        .filter((m) => m.team.id === team.id)
        .map((m) => ({ id: m.id, role: m.role, user: summary(m.user) })),
    }));
  }

  async findById(id: number): Promise<Team | null> {
    return this.teamRepository.findOne({ where: { id } });
  }

  /** Creates the team and makes its creator the first manager, atomically. */
  async create(team: Partial<Team>, creatorId: number): Promise<Team> {
    return this.teamRepository.manager.transaction(async (m) => {
      const saved = await m.save(m.create(Team, { ...team, ownerId: creatorId }));
      await m.save(m.create(TeamMember, { team: saved, user: { id: creatorId }, role: TeamRole.MANAGER }));
      return saved;
    });
  }

  async update(id: number, data: Partial<Team>): Promise<Team | null> {
    await this.teamRepository.update(id, data);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.teamRepository.delete(id);
  }
}
