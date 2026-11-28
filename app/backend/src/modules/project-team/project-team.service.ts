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
    return this.repo.find({ where: { project: { id: projectId } }, relations: { team: true, project: true } });
  }

  /** The live projects shared with a team, each with the team's permission on it. */
  async findProjectsOfTeam(teamId: number): Promise<ProjectTeam[]> {
    const rows = await this.repo.find({ where: { team: { id: teamId } }, relations: { project: true } });
    return rows.filter((r) => r.project && !r.project.deletedAt);
  }

  /** True when the user is a member of the team (creating it grants nothing by itself, see TeamAccessService). */
  async canUseTeam(userId: number, teamId: number): Promise<boolean> {
    const rows: unknown[] = await this.repo.manager.query(
      'SELECT 1 FROM team_members tm WHERE tm.teamId = ? AND tm.userId = ?',
      [teamId, userId],
    );
    return rows.length > 0;
  }

  /** One team's grant on the project (with the team), or null. */
  async findOne(projectId: number, teamId: number): Promise<ProjectTeam | null> {
    return this.repo.findOne({
      where: { project: { id: projectId }, team: { id: teamId } },
      relations: { team: true },
    });
  }

  async add(projectId: number, teamId: number, permission: Permission = Permission.READ): Promise<ProjectTeam> {
    const entry = this.repo.create({
      project: { id: projectId },
      team: { id: teamId },
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
