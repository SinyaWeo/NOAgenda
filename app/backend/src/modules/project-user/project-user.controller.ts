import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AddProjectUserDto, SetPermissionDto } from './dto/project-sharing.dto';
import { NodeAccessService } from '../node/node-access.service';
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
    @Body() body: AddProjectUserDto,
    @Request() req: any,
  ): Promise<ProjectUser> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException();
    await this.access.assertAdmin(req.user.userId, Number(projectId));
    return this.projectUserService.add(projectId, body.userId, body.permission);
  }

  @Put(':userId')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('projectId') projectId: number,
    @Param('userId') userId: number,
    @Body() body: SetPermissionDto,
    @Request() req: any,
  ): Promise<void> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException();
    await this.access.assertAdmin(req.user.userId, Number(projectId));
    return this.projectUserService.update(projectId, userId, body.permission);
  }

  @Delete(':userId')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('projectId') projectId: number, @Param('userId') userId: number, @Request() req: any): Promise<void> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException();
    await this.access.assertAdmin(req.user.userId, Number(projectId));
    return this.projectUserService.remove(projectId, userId);
  }
}
