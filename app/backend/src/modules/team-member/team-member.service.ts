import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TeamMember, TeamRole } from './team-member.entity';

@Injectable()
export class TeamMemberService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
  ) {}

  async findAll(teamId?: number): Promise<TeamMember[]> {
    const where = teamId ? { team: { id: teamId } } : {};
    return this.teamMemberRepository.find({ where, relations: { user: true, team: true } });
  }

  async findByTeamIds(teamIds: number[]): Promise<TeamMember[]> {
    if (!teamIds.length) return [];
    return this.teamMemberRepository.find({
      where: { team: { id: In(teamIds) } },
      relations: { user: true, team: true },
    });
  }

  async findById(id: number): Promise<TeamMember | null> {
    return this.teamMemberRepository.findOne({ where: { id }, relations: { team: true, user: true } });
  }

  /** New members always start as regular members; only the app admin promotes. */
  async add(userId: number, teamId: number): Promise<TeamMember> {
    const newMember = this.teamMemberRepository.create({
      user: { id: userId },
      team: { id: teamId },
      role: TeamRole.MEMBER,
    });
    return this.teamMemberRepository.save(newMember);
  }

  /** A team must always keep at least one manager (never demote or remove the last one). */
  async assertNotLastManager(member: TeamMember): Promise<void> {
    if (member.role !== TeamRole.MANAGER) return;
    const managers = await this.teamMemberRepository.count({
      where: { team: { id: member.team.id }, role: TeamRole.MANAGER },
    });
    if (managers <= 1) throw new BadRequestException('A team must keep at least one manager');
  }

  async setRole(teamId: number, memberId: number, role: TeamRole): Promise<TeamMember> {
    const member = await this.findById(memberId);
    if (!member || member.team.id !== teamId) throw new NotFoundException();
    if (role === TeamRole.MEMBER) await this.assertNotLastManager(member);
    member.role = role;
    await this.teamMemberRepository.update(memberId, { role });
    return member;
  }

  async remove(id: number): Promise<void> {
    await this.teamMemberRepository.delete(id);
  }
}
