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

  async findAll(): Promise<TeamMember[]> {
    return this.teamMemberRepository.find({ relations: ['user', 'team'] });
  }

  async add(user: any, team: any): Promise<TeamMember> {
    const newMember = this.teamMemberRepository.create({ user, team });
    return this.teamMemberRepository.save(newMember);
  }

  async remove(id: number): Promise<void> {
    await this.teamMemberRepository.delete(id);
  }
}
