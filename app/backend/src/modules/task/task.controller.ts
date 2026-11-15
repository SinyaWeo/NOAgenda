import { BadRequestException, Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, NotFoundException, ForbiddenException, Request } from '@nestjs/common';
import { TaskService, TaskFilter } from './task.service';
import { Node, NodeStatus } from '../node/node.entity';
import { AuthGuard } from '@nestjs/passport';
import { NodeAccessService } from '../node/node-access.service';

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(
    @Request() req: any,
    @Query('projectId') projectId?: number,
    @Query('parentTaskId') parentTaskId?: number,
    @Query('status') status?: NodeStatus,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<Node[]> {
    const filter: TaskFilter = { userId: req.user.userId };
    if (projectId) filter.projectId = Number(projectId);
    if (parentTaskId !== undefined) filter.parentTaskId = Number(parentTaskId);
    if (status) filter.status = status;
    if (search) filter.search = search;
    if (sort) filter.sort = sort;
    if (order) filter.order = order;
    if (page) filter.page = Number(page);
    if (limit) filter.limit = Number(limit);
    return this.taskService.findAll(filter);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: number, @Request() req: any): Promise<Node> {
    await this.access.assertRead(req.user.userId, Number(id));
    const task = await this.taskService.findById(Number(id));
    if (!task) throw new NotFoundException();
    return task;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Node>, @Request() req: any): Promise<Node> {
    const data = this.taskService.normalizeTaskPayload(this.access.sanitize(body));
    await this.access.assertCanUseAsParent(req.user.userId, data.parentId);
    return this.taskService.create({ ...data, createdBy: req.user.userId });
  }

  @Post('bulk')
  @UseGuards(AuthGuard('jwt'))
  async bulkUpdate(@Body() body: { ids: number[]; data: Partial<Node> }, @Request() req: any): Promise<Node[]> {
    if (!Array.isArray(body?.ids) || body.ids.length === 0 || body.ids.length > 200) {
      throw new BadRequestException('ids must be a non-empty array of at most 200 task ids');
    }
    const ids = body.ids.map((i) => Number(i));
    if (ids.some((i) => !Number.isInteger(i) || i < 1)) throw new BadRequestException('Invalid task id');
    // Every task must be writable by the caller before anything is changed.
    for (const id of ids) await this.access.assertWrite(req.user.userId, id);
    const data = this.taskService.normalizeTaskPayload(this.access.sanitize(body.data ?? {}));
    delete (data as any).type;
    if (data.parentId !== undefined) await this.access.assertCanUseAsParent(req.user.userId, data.parentId);
    return this.taskService.bulkUpdate(ids, data, req.user.userId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Node>, @Request() req: any): Promise<Node> {
    const existing = await this.taskService.findById(id);
    if (!existing) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, existing.id);
    // Prevent mass-assignment of ownership/identity fields; type is immutable.
    const safeBody = this.taskService.normalizeTaskPayload(this.access.sanitize(body));
    delete (safeBody as any).type;
    if (safeBody.parentId !== undefined && safeBody.parentId !== existing.parentId) {
      await this.access.assertCanUseAsParent(req.user.userId, safeBody.parentId);
    }
    const task = await this.taskService.update(id, safeBody);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Put(':id/duplicate')
  @UseGuards(AuthGuard('jwt'))
  async duplicate(@Param('id') id: number, @Request() req: any): Promise<Node> {
    await this.access.assertWrite(req.user.userId, Number(id));
    const task = await this.taskService.duplicate(Number(id), req.user.userId);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Post(':id/position')
  @UseGuards(AuthGuard('jwt'))
  async updatePosition(@Param('id') id: number, @Body() body: { position: number }, @Request() req: any): Promise<Node> {
    const existing = await this.taskService.findById(id);
    if (!existing) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, existing.id);
    const task = await this.taskService.updatePosition(id, body.position);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Post(':id/read')
  @UseGuards(AuthGuard('jwt'))
  async markRead(@Param('id') id: number, @Request() req: any): Promise<Node> {
    const existing = await this.taskService.findById(id);
    if (!existing) throw new NotFoundException();
    await this.access.assertRead(req.user.userId, existing.id);
    const task = await this.taskService.update(id, { isUnread: false } as any);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const existing = await this.taskService.findById(id);
    if (!existing) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, existing.id);
    return this.taskService.remove(id);
  }
}
