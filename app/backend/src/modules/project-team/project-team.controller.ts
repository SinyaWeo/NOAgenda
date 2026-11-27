import { MultiUserOnly } from '../../common/decorators/multi-user-only.decorator';
import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, Post, Put, Delete, Param, Body, Request, ForbiddenException } from '@nestjs/common';
import { AddProjectTeamDto, SetPermissionDto } from '../project-user/dto/project-sharing.dto';
import { Access, NodeAccessService } from '../node/node-access.service';
import { ProjectTeamService } from './project-team.service';
import { ProjectTeam } from './project-team.entity';

@MultiUserOnly()
@Controller('projects/:projectId/teams')
export class ProjectTeamController {
  constructor(
    private readonly projectTeamService: ProjectTeamService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  async findAll(@Param('projectId') projectId: number, @Request() req: AuthRequest): Promise<ProjectTeam[]> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.READ);
    return this.projectTeamService.findByProject(projectId);
  }

  @Post()
  async add(
    @Param('projectId') projectId: number,
    @Body() body: AddProjectTeamDto,
    @Request() req: AuthRequest,
  ): Promise<ProjectTeam> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.ADMIN);
    if (!(await this.projectTeamService.canUseTeam(req.user.userId, Number(body.teamId))))
      throw new ForbiddenException();
    return this.projectTeamService.add(projectId, body.teamId, body.permission);
  }

  @Put(':teamId')
  async update(
    @Param('projectId') projectId: number,
    @Param('teamId') teamId: number,
    @Body() body: SetPermissionDto,
    @Request() req: AuthRequest,
  ): Promise<void> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.ADMIN);
    return this.projectTeamService.update(projectId, teamId, body.permission);
  }

  @Delete(':teamId')
  async remove(
    @Param('projectId') projectId: number,
    @Param('teamId') teamId: number,
    @Request() req: AuthRequest,
  ): Promise<void> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.ADMIN);
    return this.projectTeamService.remove(projectId, teamId);
  }
}
