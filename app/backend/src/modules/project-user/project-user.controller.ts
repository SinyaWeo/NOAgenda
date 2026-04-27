import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectUserService } from './project-user.service';
import { ProjectService } from '../project/project.service';
import { ProjectUser, Permission } from './project-user.entity';

@Controller('projects/:projectId/users')
export class ProjectUserController {
  constructor(
    private readonly projectUserService: ProjectUserService,
    private readonly projectService: ProjectService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Param('projectId') projectId: number, @Request() req: any): Promise<ProjectUser[]> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException();
    const accessible = await this.projectService.findAll(req.user.userId);
    if (!accessible.some((p) => p.id === Number(projectId))) throw new ForbiddenException();
    return this.projectUserService.findByProject(projectId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async add(
    @Param('projectId') projectId: number,
    @Body() body: { userId: number; permission?: Permission },
    @Request() req: any,
  ): Promise<ProjectUser> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== undefined && project.ownerId !== req.user.userId) throw new ForbiddenException();
    return this.projectUserService.add(projectId, body.userId, body.permission);
  }

  @Put(':userId')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('projectId') projectId: number,
    @Param('userId') userId: number,
    @Body() body: { permission: Permission },
    @Request() req: any,
  ): Promise<void> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== undefined && project.ownerId !== req.user.userId) throw new ForbiddenException();
    return this.projectUserService.update(projectId, userId, body.permission);
  }

  @Delete(':userId')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('projectId') projectId: number, @Param('userId') userId: number, @Request() req: any): Promise<void> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== undefined && project.ownerId !== req.user.userId) throw new ForbiddenException();
    return this.projectUserService.remove(projectId, userId);
  }
}
