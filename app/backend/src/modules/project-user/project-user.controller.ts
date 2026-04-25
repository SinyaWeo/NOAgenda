import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectUserService } from './project-user.service';
import { ProjectUser, Permission } from './project-user.entity';

@Controller('projects/:projectId/users')
export class ProjectUserController {
  constructor(private readonly projectUserService: ProjectUserService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Param('projectId') projectId: number): Promise<ProjectUser[]> {
    return this.projectUserService.findByProject(projectId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async add(
    @Param('projectId') projectId: number,
    @Body() body: { userId: number; permission?: Permission },
  ): Promise<ProjectUser> {
    return this.projectUserService.add(projectId, body.userId, body.permission);
  }

  @Put(':userId')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('projectId') projectId: number,
    @Param('userId') userId: number,
    @Body() body: { permission: Permission },
  ): Promise<void> {
    return this.projectUserService.update(projectId, userId, body.permission);
  }

  @Delete(':userId')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('projectId') projectId: number, @Param('userId') userId: number): Promise<void> {
    return this.projectUserService.remove(projectId, userId);
  }
}
