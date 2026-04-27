import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './team.entity';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

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
