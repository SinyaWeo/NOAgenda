import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { KanbanBucketService } from './kanban-bucket.service';
import { KanbanBucket } from './kanban-bucket.entity';
import { ProjectService } from '../project/project.service';
import { Access, NodeAccessService } from '../node/node-access.service';
import { CreateBucketDto, UpdateBucketDto } from './dto/kanban-bucket.dto';

@Controller('projects/:projectId/views/:viewId/buckets')
export class KanbanBucketController {
  constructor(
    private readonly service: KanbanBucketService,
    private readonly projectService: ProjectService,
    private readonly access: NodeAccessService,
  ) {}

  private async assertAccess(projectId: number, req: any, requireOwner = false): Promise<void> {
    // Owner or ADMIN grant to manage views/buckets; any grant (user or team) to read them.
    await this.access.assertProject(req.user.userId, Number(projectId), requireOwner ? Access.ADMIN : Access.READ);
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
    @Body() body: CreateBucketDto,
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
    @Body() body: UpdateBucketDto,
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
