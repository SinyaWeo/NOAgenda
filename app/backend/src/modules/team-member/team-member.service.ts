import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TeamMember } from './team-member.entity';

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

  async add(userId: number, teamId: number): Promise<TeamMember> {
    const newMember = this.teamMemberRepository.create({
      user: { id: userId },
      team: { id: teamId },
    });
    return this.teamMemberRepository.save(newMember);
  }

  async remove(id: number): Promise<void> {
    await this.teamMemberRepository.delete(id);
  }
}
