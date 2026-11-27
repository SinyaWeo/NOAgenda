import type { AuthRequest } from '../../common/auth-user';
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { Node } from '../node/node.entity';
import { Permission } from '../project-user/project-user.entity';
import { Access, NodeAccessService } from '../node/node-access.service';
import { normalizeParentRefs } from '../node/node-payload';
import { ProjectCreateDto, ProjectUpdateDto } from '../node/dto/node.dto';
import { ProjectTeamService } from '../project-team/project-team.service';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { NOT_IN_SINGLE_USER_MODE } from '../../common/guards/single-user-mode.guard';

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly access: NodeAccessService,
    private readonly projectTeams: ProjectTeamService,
    private readonly appSettings: AppSettingsService,
  ) {}

  @Get()
  async findAll(@Request() req: AuthRequest, @Query('includeArchived') includeArchived?: string): Promise<Node[]> {
    return this.projectService.findAll(req.user.userId, includeArchived === 'true');
  }

  @Get('stats')
  async getStats(@Request() req: AuthRequest): Promise<Record<number, { total: number; done: number }>> {
    const projects = await this.projectService.findAll(req.user.userId);
    const ids = projects.map((p) => p.id);
    return this.projectService.getTaskStats(ids);
  }

  @Get(':id')
  async findById(@Param('id') id: number, @Request() req: AuthRequest): Promise<Node & { access?: Permission }> {
    await this.access.assertProject(req.user.userId, Number(id), Access.READ);
    const project: (Node & { access?: Permission }) | null = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    // The caller's permission decides what the UI offers (e.g. managing Kanban buckets).
    project.access = (await this.access.projectPermissions(req.user.userId, [project])).get(project.id);
    return project;
  }

  @Post()
  async create(@Body() body: ProjectCreateDto, @Request() req: AuthRequest): Promise<Node> {
    // sanitize() strips id/ownerId/etc. so a client cannot overwrite someone else's node.
    const { teamId, teamPermission, ...rest } = body;
    const data = normalizeParentRefs(this.access.sanitize(rest));
    delete data.type;
    await this.access.assertCanUseAsParent(req.user.userId, data.parentId);
    await this.access.assertProjectParent(data.parentId); // a subproject goes under a project, never a task
    // Sharing with a team at creation: checked before anything is created.
    if (teamId !== undefined) {
      if (await this.appSettings.singleUserMode()) throw new ForbiddenException(NOT_IN_SINGLE_USER_MODE);
      if (!(await this.projectTeams.canUseTeam(req.user.userId, teamId))) throw new ForbiddenException();
    }
    const project = await this.projectService.create({ ...data, ownerId: req.user.userId }, req.user.userId);
    if (teamId !== undefined) await this.projectTeams.add(project.id, teamId, teamPermission ?? Permission.WRITE);
    return project;
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: ProjectUpdateDto, @Request() req: AuthRequest): Promise<Node> {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== req.user.userId) throw new ForbiddenException();
    // Prevent mass-assignment of ownership/identity fields
    const safeBody = normalizeParentRefs(this.access.sanitize(body));
    delete safeBody.type;
    if (safeBody.parentId !== undefined && safeBody.parentId !== project.parentId) {
      // Only the owner moves a project (checked above); the new parent must be a project they can write to.
      await this.access.assertCanReparent(
        req.user.userId,
        [project.id],
        safeBody.parentId === null ? null : Number(safeBody.parentId),
      );
    }
    const updated = await this.projectService.update(id, safeBody, req.user.userId);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Put(':id/duplicate')
  async duplicate(@Param('id') id: number, @Request() req: AuthRequest): Promise<Node> {
    await this.access.assertProject(req.user.userId, Number(id), Access.READ);
    const source = await this.projectService.findById(id);
    if (!source) throw new NotFoundException();
    // The copy lands under the same parent, so the caller must be allowed to put things there.
    await this.access.assertCanUseAsParent(req.user.userId, source.parentId);
    const project = await this.projectService.duplicate(id, req.user.userId);
    if (!project) throw new NotFoundException();
    return project;
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== req.user.userId) throw new ForbiddenException();
    return this.projectService.remove(id, req.user.userId);
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: number, @Request() req: AuthRequest): Promise<Node> {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== req.user.userId) throw new ForbiddenException();
    const updated = await this.projectService.archive(id, req.user.userId);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Patch(':id/unarchive')
  async unarchive(@Param('id') id: number, @Request() req: AuthRequest): Promise<Node> {
    const project = await this.projectService.findById(id);
    if (!project) throw new NotFoundException();
    if (project.ownerId !== req.user.userId) throw new ForbiddenException();
    const updated = await this.projectService.unarchive(id, req.user.userId);
    if (!updated) throw new NotFoundException();
    return updated;
  }
}
