import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NodeAccessService } from '../node/node-access.service';
import { ProjectTeamService } from './project-team.service';
import { ProjectService } from '../project/project.service';
import { ProjectTeam } from './project-team.entity';
import { Permission } from '../project-user/project-user.entity';

@Controller('projects/:projectId/teams')
export class ProjectTeamController {
  constructor(
    private readonly projectTeamService: ProjectTeamService,
    private readonly projectService: ProjectService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Param('projectId') projectId: number, @Request() req: any): Promise<ProjectTeam[]> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException();
    const accessible = await this.projectService.findAll(req.user.userId);
    if (!accessible.some((p) => p.id === Number(projectId))) throw new ForbiddenException();
    return this.projectTeamService.findByProject(projectId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async add(
    @Param('projectId') projectId: number,
    @Body() body: { teamId: number; permission?: Permission },
    @Request() req: any,
  ): Promise<ProjectTeam> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException();
    await this.access.assertAdmin(req.user.userId, Number(projectId));
    return this.projectTeamService.add(projectId, body.teamId, body.permission);
  }

  @Put(':teamId')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('projectId') projectId: number,
    @Param('teamId') teamId: number,
    @Body() body: { permission: Permission },
    @Request() req: any,
  ): Promise<void> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException();
    await this.access.assertAdmin(req.user.userId, Number(projectId));
    return this.projectTeamService.update(projectId, teamId, body.permission);
  }

  @Delete(':teamId')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('projectId') projectId: number, @Param('teamId') teamId: number, @Request() req: any): Promise<void> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException();
    await this.access.assertAdmin(req.user.userId, Number(projectId));
    return this.projectTeamService.remove(projectId, teamId);
  }
}
