import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectTeam } from './project-team.entity';
import { orConflict } from '../../common/db-errors';
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

  /** True when the user owns the team or is one of its members. */
  async canUseTeam(userId: number, teamId: number): Promise<boolean> {
    const rows: unknown[] = await this.repo.manager.query(
      `SELECT 1 FROM teams t
        WHERE t.id = ? AND (t.ownerId = ? OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.teamId = t.id AND tm.userId = ?))`,
      [teamId, userId, userId],
    );
    return rows.length > 0;
  }

  async add(projectId: number, teamId: number, permission: Permission = Permission.READ): Promise<ProjectTeam> {
    const entry = this.repo.create({
      project: { id: projectId } as any,
      team: { id: teamId } as any,
      permission,
    });
    return orConflict(this.repo.save(entry), 'This team already has access to the project');
  }

  async update(projectId: number, teamId: number, permission: Permission): Promise<void> {
    await this.repo.update({ project: { id: projectId }, team: { id: teamId } }, { permission });
  }

  async remove(projectId: number, teamId: number): Promise<void> {
    await this.repo.delete({ project: { id: projectId }, team: { id: teamId } });
  }
}
