import { MultiUserOnly } from '../../common/decorators/multi-user-only.decorator';
import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, Param, Request } from '@nestjs/common';
import { NodeAccessService } from '../node/node-access.service';
import { TeamAccessService } from '../team/team-access.service';
import { Permission } from '../project-user/project-user.entity';
import { ProjectTeamService } from './project-team.service';

export interface TeamProject {
  id: number;
  name: string;
  isArchived: boolean;
  /** What the team may do on the project. */
  permission: Permission;
  /** What the caller may do on it (from any grant, not only this team's). */
  access: Permission;
}

/** The projects shared with a team, for its members. Only projects the caller can open are listed. */
@MultiUserOnly()
@Controller('teams/:teamId/projects')
export class TeamProjectsController {
  constructor(
    private readonly projectTeams: ProjectTeamService,
    private readonly teamAccess: TeamAccessService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  async findAll(@Param('teamId') teamId: number, @Request() req: AuthRequest): Promise<TeamProject[]> {
    await this.teamAccess.assertView(req.user, Number(teamId));
    const rows = await this.projectTeams.findProjectsOfTeam(Number(teamId));
    const mine = await this.access.projectPermissions(
      req.user.userId,
      rows.map((r) => r.project),
    );
    return rows.flatMap((r) => {
      const access = mine.get(r.project.id);
      if (!access) return [];
      const name = r.project.name ?? r.project.title ?? '';
      return [{ id: r.project.id, name, isArchived: r.project.isArchived, permission: r.permission, access }];
    });
  }
}
