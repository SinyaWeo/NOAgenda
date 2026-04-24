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

  async findAll(): Promise<Team[]> {
    return this.teamRepository.find();
  }

  async findById(id: number): Promise<Team | null> {
    return this.teamRepository.findOne({ where: { id } });
  }

  async create(team: Partial<Team>): Promise<Team> {
    const newTeam = this.teamRepository.create(team);
    return this.teamRepository.save(newTeam);
  }
}
