import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectTeam } from './project-team.entity';
import { Permission } from '../project-user/project-user.entity';

@Injectable()
export class ProjectTeamService {
  constructor(
    @InjectRepository(ProjectTeam)
    private readonly repo: Repository<ProjectTeam>,
  ) {}

  async findByProject(projectId: number): Promise<ProjectTeam[]> {
    return this.repo.find({ where: { project: { id: projectId } }, relations: ['team', 'project'] });
  }

  async add(projectId: number, teamId: number, permission: Permission = Permission.READ): Promise<ProjectTeam> {
    const entry = this.repo.create({
      project: { id: projectId } as any,
      team: { id: teamId } as any,
      permission,
    });
    return this.repo.save(entry);
  }

  async update(projectId: number, teamId: number, permission: Permission): Promise<void> {
    await this.repo.update({ project: { id: projectId }, team: { id: teamId } }, { permission });
  }

  async remove(projectId: number, teamId: number): Promise<void> {
    await this.repo.delete({ project: { id: projectId }, team: { id: teamId } });
  }
}
