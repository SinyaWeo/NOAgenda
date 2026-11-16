import { Controller, Get, Post, Put, Delete, Param, Body, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AddProjectUserDto, SetPermissionDto } from './dto/project-sharing.dto';
import { Access, NodeAccessService } from '../node/node-access.service';
import { ProjectUserService } from './project-user.service';
import { ProjectService } from '../project/project.service';
import { ProjectUser, Permission } from './project-user.entity';

@Controller('projects/:projectId/users')
export class ProjectUserController {
  constructor(
    private readonly projectUserService: ProjectUserService,
    private readonly projectService: ProjectService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  async findAll(@Param('projectId') projectId: number, @Request() req: any): Promise<ProjectUser[]> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.READ);
    return this.projectUserService.findByProject(projectId);
  }

  @Post()
  async add(
    @Param('projectId') projectId: number,
    @Body() body: AddProjectUserDto,
    @Request() req: any,
  ): Promise<ProjectUser> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.ADMIN);
    return this.projectUserService.add(projectId, body.userId, body.permission);
  }

  @Put(':userId')
  async update(
    @Param('projectId') projectId: number,
    @Param('userId') userId: number,
    @Body() body: SetPermissionDto,
    @Request() req: any,
  ): Promise<void> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.ADMIN);
    return this.projectUserService.update(projectId, userId, body.permission);
  }

  @Delete(':userId')
  async remove(@Param('projectId') projectId: number, @Param('userId') userId: number, @Request() req: any): Promise<void> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.ADMIN);
    return this.projectUserService.remove(projectId, userId);
  }
}
