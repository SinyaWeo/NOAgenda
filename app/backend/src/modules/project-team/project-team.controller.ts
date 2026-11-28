import { MultiUserOnly } from '../../common/decorators/multi-user-only.decorator';
import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, Post, Put, Delete, Param, Body, Request, ForbiddenException } from '@nestjs/common';
import { AddProjectTeamDto, SetPermissionDto } from '../project-user/dto/project-sharing.dto';
import { Access, NodeAccessService } from '../node/node-access.service';
import { NodeService } from '../node/node.service';
import { ProjectTeamService } from './project-team.service';
import { ProjectTeam } from './project-team.entity';
import { Permission } from '../project-user/project-user.entity';
import { DomainEvents } from '../../common/domain-events';
import { auditShareChange } from '../project-user/share-audit';

@MultiUserOnly()
@Controller('projects/:projectId/teams')
export class ProjectTeamController {
  constructor(
    private readonly projectTeamService: ProjectTeamService,
    private readonly access: NodeAccessService,
    private readonly nodes: NodeService,
    private readonly events: DomainEvents,
  ) {}

  private audit(
    projectId: number,
    actorId: number,
    teamId: number,
    grant: ProjectTeam | null,
    from: Permission | null,
    to: Permission | null,
  ): Promise<void> {
    return auditShareChange(this.events, this.nodes, {
      projectId,
      actorId,
      target: { type: 'team', id: teamId, name: grant?.team?.name ?? null },
      from,
      to,
    });
  }

  @Get()
  async findAll(@Param('projectId') projectId: number, @Request() req: AuthRequest): Promise<ProjectTeam[]> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.ADMIN);
    return this.projectTeamService.findByProject(projectId);
  }

  /** Only a team the caller belongs to: its members are the people the caller works with. */
  @Post()
  async add(
    @Param('projectId') projectId: number,
    @Body() body: AddProjectTeamDto,
    @Request() req: AuthRequest,
  ): Promise<ProjectTeam> {
    const pid = Number(projectId);
    const teamId = Number(body.teamId);
    await this.access.assertProject(req.user.userId, pid, Access.ADMIN);
    if (!(await this.projectTeamService.canUseTeam(req.user.userId, teamId))) throw new ForbiddenException();
    const entry = await this.projectTeamService.add(projectId, body.teamId, body.permission);
    const saved = await this.projectTeamService.findOne(pid, teamId);
    await this.audit(
      pid,
      req.user.userId,
      teamId,
      saved,
      null,
      saved?.permission ?? body.permission ?? Permission.READ,
    );
    return entry;
  }

  @Put(':teamId')
  async update(
    @Param('projectId') projectId: number,
    @Param('teamId') teamId: number,
    @Body() body: SetPermissionDto,
    @Request() req: AuthRequest,
  ): Promise<void> {
    const pid = Number(projectId);
    const tid = Number(teamId);
    await this.access.assertProject(req.user.userId, pid, Access.ADMIN);
    const grant = await this.projectTeamService.findOne(pid, tid);
    if (!grant || grant.permission === body.permission) return;
    await this.projectTeamService.update(pid, tid, body.permission);
    await this.audit(pid, req.user.userId, tid, grant, grant.permission, body.permission);
  }

  @Delete(':teamId')
  async remove(
    @Param('projectId') projectId: number,
    @Param('teamId') teamId: number,
    @Request() req: AuthRequest,
  ): Promise<void> {
    const pid = Number(projectId);
    const tid = Number(teamId);
    await this.access.assertProject(req.user.userId, pid, Access.ADMIN);
    const grant = await this.projectTeamService.findOne(pid, tid);
    if (!grant) return;
    await this.projectTeamService.remove(pid, tid);
    await this.audit(pid, req.user.userId, tid, grant, grant.permission, null);
  }
}
