import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, ForbiddenException, NotFoundException, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { KanbanBucketService } from './kanban-bucket.service';
import { KanbanBucket } from './kanban-bucket.entity';
import { ProjectService } from '../project/project.service';

@Controller('projects/:projectId/views/:viewId/buckets')
@UseGuards(AuthGuard('jwt'))
export class KanbanBucketController {
  constructor(
    private readonly service: KanbanBucketService,
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
  async findAll(
    @Param('projectId') projectId: number,
    @Param('viewId') viewId: number,
    @Request() req: any,
  ): Promise<KanbanBucket[]> {
    await this.assertAccess(projectId, req);
    return this.service.findAll(projectId, viewId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: number,
    @Param('projectId') projectId: number,
    @Param('viewId') viewId: number,
    @Request() req: any,
  ): Promise<KanbanBucket> {
    await this.assertAccess(projectId, req);
    return this.service.findOne(id, projectId, viewId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('projectId') projectId: number,
    @Param('viewId') viewId: number,
    @Body() body: Partial<KanbanBucket>,
    @Request() req: any,
  ): Promise<KanbanBucket> {
    await this.assertAccess(projectId, req, true);
    return this.service.create(projectId, viewId, body);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Param('projectId') projectId: number,
    @Param('viewId') viewId: number,
    @Body() body: Partial<KanbanBucket>,
    @Request() req: any,
  ): Promise<KanbanBucket> {
    await this.assertAccess(projectId, req, true);
    return this.service.update(id, projectId, viewId, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: number,
    @Param('projectId') projectId: number,
    @Param('viewId') viewId: number,
    @Request() req: any,
  ): Promise<void> {
    await this.assertAccess(projectId, req, true);
    return this.service.remove(id, projectId, viewId);
  }
}
