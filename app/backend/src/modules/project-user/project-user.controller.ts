import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, Post, Put, Delete, Param, Body, Request } from '@nestjs/common';
import { AddProjectUserDto, SetPermissionDto } from './dto/project-sharing.dto';
import { Access, NodeAccessService } from '../node/node-access.service';
import { ProjectUserService } from './project-user.service';
import { ProjectService } from '../project/project.service';
import { ProjectUser } from './project-user.entity';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service';

@Controller('projects/:projectId/users')
export class ProjectUserController {
  constructor(
    private readonly projectUserService: ProjectUserService,
    private readonly projectService: ProjectService,
    private readonly access: NodeAccessService,
    private readonly notifications: NotificationService,
    private readonly users: UserService,
  ) {}

  @Get()
  async findAll(@Param('projectId') projectId: number, @Request() req: AuthRequest): Promise<ProjectUser[]> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.READ);
    return this.projectUserService.findByProject(projectId);
  }

  @Post()
  async add(
    @Param('projectId') projectId: number,
    @Body() body: AddProjectUserDto,
    @Request() req: AuthRequest,
  ): Promise<ProjectUser> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.ADMIN);
    await this.users.assertActive(body.userId);
    const member = await this.projectUserService.add(projectId, body.userId, body.permission);
    void this.projectService
      .findById(Number(projectId))
      .then((project) =>
        this.notifications.notify({
          type: 'project_added',
          recipients: [body.userId],
          actorId: req.user.userId,
          actorName: req.user.username,
          nodeId: Number(projectId),
          kind: 'project',
          title: project?.name ?? '',
        }),
      )
      .catch(() => undefined);
    return member;
  }

  @Put(':userId')
  async update(
    @Param('projectId') projectId: number,
    @Param('userId') userId: number,
    @Body() body: SetPermissionDto,
    @Request() req: AuthRequest,
  ): Promise<void> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.ADMIN);
    return this.projectUserService.update(projectId, userId, body.permission);
  }

  @Delete(':userId')
  async remove(
    @Param('projectId') projectId: number,
    @Param('userId') userId: number,
    @Request() req: AuthRequest,
  ): Promise<void> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.ADMIN);
    return this.projectUserService.remove(projectId, userId);
  }
}
