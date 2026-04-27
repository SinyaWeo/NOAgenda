import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, NotFoundException, ForbiddenException, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectViewService } from './project-view.service';
import { ProjectService } from '../project/project.service';
import { ProjectView, ViewType } from './project-view.entity';

@Controller('projects/:projectId/views')
export class ProjectViewController {
  constructor(
    private readonly projectViewService: ProjectViewService,
    private readonly projectService: ProjectService,
  ) {}

  private async assertAccess(projectId: number, req: any, requireOwner = false): Promise<void> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException();
    const accessible = await this.projectService.findAll(req.user.userId);
    if (!accessible.some((p) => p.id === Number(projectId))) throw new ForbiddenException();
    if (requireOwner && project.ownerId !== req.user.userId) throw new ForbiddenException();
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Param('projectId') projectId: number, @Request() req: any): Promise<ProjectView[]> {
    await this.assertAccess(projectId, req);
    return this.projectViewService.findByProject(projectId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('projectId') projectId: number, @Param('id') id: number, @Request() req: any): Promise<ProjectView> {
    await this.assertAccess(projectId, req);
    const view = await this.projectViewService.findById(id);
    if (!view) throw new NotFoundException();
    if (Number(view.project?.id) !== Number(projectId)) throw new ForbiddenException();
    return view;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Param('projectId') projectId: number,
    @Body() body: { title: string; viewType?: ViewType },
    @Request() req: any,
  ): Promise<ProjectView> {
    await this.assertAccess(projectId, req, true);
    return this.projectViewService.create(projectId, body.title, body.viewType);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('projectId') projectId: number,
    @Param('id') id: number,
    @Body() body: Partial<ProjectView>,
    @Request() req: any,
  ): Promise<ProjectView> {
    await this.assertAccess(projectId, req, true);
    const view = await this.projectViewService.findById(id);
    if (!view) throw new NotFoundException();
    if (Number(view.project?.id) !== Number(projectId)) throw new ForbiddenException();
    const { id: _id, project: _p, ...safeBody } = body as any;
    const updated = await this.projectViewService.update(id, safeBody);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(
    @Param('projectId') projectId: number,
    @Param('id') id: number,
    @Request() req: any,
  ): Promise<void> {
    await this.assertAccess(projectId, req, true);
    const view = await this.projectViewService.findById(id);
    if (!view) throw new NotFoundException();
    if (Number(view.project?.id) !== Number(projectId)) throw new ForbiddenException();
    return this.projectViewService.remove(id);
  }
}
