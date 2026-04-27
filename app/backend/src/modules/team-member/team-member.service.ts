import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMember } from './team-member.entity';

@Injectable()
export class TeamMemberService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
  ) {}

  async findAll(teamId?: number): Promise<TeamMember[]> {
    const where = teamId ? { team: { id: teamId } } : {};
    return this.teamMemberRepository.find({ where, relations: ['user', 'team'] });
  }

  async findById(id: number): Promise<TeamMember | null> {
    return this.teamMemberRepository.findOne({ where: { id }, relations: ['team', 'user'] });
  }

  async add(userId: number, teamId: number): Promise<TeamMember> {
    const newMember = this.teamMemberRepository.create({
      user: { id: userId } as any,
      team: { id: teamId } as any,
    });
    return this.teamMemberRepository.save(newMember);
  }

  async remove(id: number): Promise<void> {
    await this.teamMemberRepository.delete(id);
  }
}
