import { MultiUserOnly } from '../../common/decorators/multi-user-only.decorator';
import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, Post, Put, Delete, Param, Body, Request, ForbiddenException } from '@nestjs/common';
import { AddProjectUserDto, SetPermissionDto } from './dto/project-sharing.dto';
import { Access, NodeAccessService } from '../node/node-access.service';
import { ProjectUserService } from './project-user.service';
import { ProjectService } from '../project/project.service';
import { Permission, ProjectUser } from './project-user.entity';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service';
import { DomainEvents } from '../../common/domain-events';
import { auditShareChange, OUTSIDE_TEAM_SHARE } from './share-audit';

@MultiUserOnly()
@Controller('projects/:projectId/users')
export class ProjectUserController {
  constructor(
    private readonly projectUserService: ProjectUserService,
    private readonly projectService: ProjectService,
    private readonly access: NodeAccessService,
    private readonly notifications: NotificationService,
    private readonly users: UserService,
    private readonly events: DomainEvents,
  ) {}

  /**
   * A Manager may give access only to members of the project's teams; anyone else needs the owner
   * (of the project or a project above it). Returns whether the user is outside those teams.
   */
  private async assertMayGrant(actorId: number, projectId: number, userId: number): Promise<boolean> {
    const outside = !(await this.access.inProjectTeams(userId, projectId));
    if (outside && !(await this.access.ownsProjectTree(actorId, projectId)))
      throw new ForbiddenException(OUTSIDE_TEAM_SHARE);
    return outside;
  }

  private audit(
    projectId: number,
    actorId: number,
    grant: ProjectUser | null,
    userId: number,
    from: Permission | null,
    to: Permission | null,
    outsideTeam: boolean,
  ): Promise<void> {
    return auditShareChange(this.events, this.projectService, {
      projectId,
      actorId,
      target: { type: 'user', id: userId, name: grant?.user?.username ?? null },
      from,
      to,
      outsideTeam,
    });
  }

  @Get()
  async findAll(@Param('projectId') projectId: number, @Request() req: AuthRequest): Promise<ProjectUser[]> {
    await this.access.assertProject(req.user.userId, Number(projectId), Access.ADMIN);
    return this.projectUserService.findByProject(projectId);
  }

  @Post()
  async add(
    @Param('projectId') projectId: number,
    @Body() body: AddProjectUserDto,
    @Request() req: AuthRequest,
  ): Promise<ProjectUser> {
    const pid = Number(projectId);
    await this.access.assertProject(req.user.userId, pid, Access.ADMIN);
    await this.users.assertActive(body.userId);
    const outside = await this.assertMayGrant(req.user.userId, pid, body.userId);
    const member = await this.projectUserService.add(projectId, body.userId, body.permission);
    const saved = await this.projectUserService.findOne(pid, body.userId);
    await this.audit(
      pid,
      req.user.userId,
      saved,
      body.userId,
      null,
      saved?.permission ?? body.permission ?? Permission.READ,
      outside,
    );
    void this.projectService
      .findById(pid)
      .then((project) =>
        this.notifications.notify({
          type: 'project_added',
          recipients: [body.userId],
          actorId: req.user.userId,
          actorName: req.user.username,
          nodeId: pid,
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
    const pid = Number(projectId);
    const uid = Number(userId);
    await this.access.assertProject(req.user.userId, pid, Access.ADMIN);
    const grant = await this.projectUserService.findOne(pid, uid);
    if (!grant || grant.permission === body.permission) return;
    const outside = await this.assertMayGrant(req.user.userId, pid, uid);
    await this.projectUserService.update(pid, uid, body.permission);
    await this.audit(pid, req.user.userId, grant, uid, grant.permission, body.permission, outside);
  }

  /** Any Manager may take access away (that only narrows who sees the project). */
  @Delete(':userId')
  async remove(
    @Param('projectId') projectId: number,
    @Param('userId') userId: number,
    @Request() req: AuthRequest,
  ): Promise<void> {
    const pid = Number(projectId);
    const uid = Number(userId);
    await this.access.assertProject(req.user.userId, pid, Access.ADMIN);
    const grant = await this.projectUserService.findOne(pid, uid);
    if (!grant) return;
    await this.projectUserService.remove(pid, uid);
    const outside = !(await this.access.inProjectTeams(uid, pid));
    await this.audit(pid, req.user.userId, grant, uid, grant.permission, null, outside);
  }
}
