import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { KanbanBucketService } from './kanban-bucket.service';
import { KanbanBucket } from './kanban-bucket.entity';
import { Access, NodeAccessService } from '../node/node-access.service';
import { CreateBucketDto, UpdateBucketDto } from './dto/kanban-bucket.dto';

@Controller('projects/:projectId/buckets')
export class KanbanBucketController {
  constructor(
    private readonly service: KanbanBucketService,
    private readonly access: NodeAccessService,
  ) {}

  private async assertAccess(projectId: number, req: AuthRequest, manage = false): Promise<void> {
    // Project managers (ADMIN grant) manage the buckets; any grant (user or team) reads them.
    await this.access.assertProject(req.user.userId, Number(projectId), manage ? Access.ADMIN : Access.READ);
  }

  @Get()
  async findAll(@Param('projectId') projectId: number, @Request() req: AuthRequest): Promise<KanbanBucket[]> {
    await this.assertAccess(projectId, req);
    return this.service.findAll(projectId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: number,
    @Param('projectId') projectId: number,
    @Request() req: AuthRequest,
  ): Promise<KanbanBucket> {
    await this.assertAccess(projectId, req);
    return this.service.findOne(id, projectId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('projectId') projectId: number,
    @Body() body: CreateBucketDto,
    @Request() req: AuthRequest,
  ): Promise<KanbanBucket> {
    await this.assertAccess(projectId, req, true);
    return this.service.create(projectId, body);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Param('projectId') projectId: number,
    @Body() body: UpdateBucketDto,
    @Request() req: AuthRequest,
  ): Promise<KanbanBucket> {
    await this.assertAccess(projectId, req, true);
    return this.service.update(id, projectId, body as Partial<KanbanBucket>);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: number,
    @Param('projectId') projectId: number,
    @Request() req: AuthRequest,
  ): Promise<void> {
    await this.assertAccess(projectId, req, true);
    return this.service.remove(id, projectId);
  }
}
