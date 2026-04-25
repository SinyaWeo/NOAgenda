import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectTeamService } from './project-team.service';
import { ProjectTeam } from './project-team.entity';
import { Permission } from '../project-user/project-user.entity';

@Controller('projects/:projectId/teams')
export class ProjectTeamController {
  constructor(private readonly projectTeamService: ProjectTeamService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Param('projectId') projectId: number): Promise<ProjectTeam[]> {
    return this.projectTeamService.findByProject(projectId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async add(
    @Param('projectId') projectId: number,
    @Body() body: { teamId: number; permission?: Permission },
  ): Promise<ProjectTeam> {
    return this.projectTeamService.add(projectId, body.teamId, body.permission);
  }

  @Put(':teamId')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('projectId') projectId: number,
    @Param('teamId') teamId: number,
    @Body() body: { permission: Permission },
  ): Promise<void> {
    return this.projectTeamService.update(projectId, teamId, body.permission);
  }

  @Delete(':teamId')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('projectId') projectId: number, @Param('teamId') teamId: number): Promise<void> {
    return this.projectTeamService.remove(projectId, teamId);
  }
}
