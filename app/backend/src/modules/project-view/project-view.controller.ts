import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, NotFoundException, ForbiddenException, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateViewDto, UpdateViewDto } from './dto/project-view.dto';
import { ProjectViewService } from './project-view.service';
import { ProjectService } from '../project/project.service';
import { Access, NodeAccessService } from '../node/node-access.service';
import { ProjectView, ViewType } from './project-view.entity';

@Controller('projects/:projectId/views')
export class ProjectViewController {
  constructor(
    private readonly projectViewService: ProjectViewService,
    private readonly projectService: ProjectService,
    private readonly access: NodeAccessService,
  ) {}

  private async assertAccess(projectId: number, req: any, requireOwner = false): Promise<void> {
    // Owner or ADMIN grant to manage views/buckets; any grant (user or team) to read them.
    await this.access.assertProject(req.user.userId, Number(projectId), requireOwner ? Access.ADMIN : Access.READ);
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
    @Body() body: CreateViewDto,
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
    @Body() body: UpdateViewDto,
    @Request() req: any,
  ): Promise<ProjectView> {
    await this.assertAccess(projectId, req, true);
    const view = await this.projectViewService.findById(id);
    if (!view) throw new NotFoundException();
    if (Number(view.project?.id) !== Number(projectId)) throw new ForbiddenException();
    const updated = await this.projectViewService.update(id, { ...body });
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
