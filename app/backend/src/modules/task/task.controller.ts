import { Controller, Get, Post, Put, Delete, Body, Param, Query, NotFoundException, Request } from '@nestjs/common';
import { TaskService, TaskFilter } from './task.service';
import { Node, NodeType } from '../node/node.entity';
import { NodeAccessService } from '../node/node-access.service';
import {
  TaskCreateDto,
  TaskUpdateDto,
  BulkTaskUpdateDto,
  TaskListQueryDto,
  TaskPositionDto,
} from '../node/dto/node.dto';

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly access: NodeAccessService,
  ) {}

  /** Load a node and require it to be a task: /tasks/* must never act on projects. */
  private async requireTask(id: number): Promise<Node> {
    const node = await this.taskService.findById(Number(id));
    if (!node || node.type !== NodeType.TASK) throw new NotFoundException();
    return node;
  }

  @Get()
  async findAll(@Request() req: any, @Query() q: TaskListQueryDto): Promise<Node[]> {
    const filter: TaskFilter = { userId: req.user.userId };
    if (q.projectId) filter.projectId = q.projectId;
    if (q.parentTaskId !== undefined) filter.parentTaskId = q.parentTaskId;
    if (q.status) filter.status = q.status;
    if (q.search) filter.search = q.search;
    if (q.sort) filter.sort = q.sort;
    if (q.order) filter.order = q.order;
    if (q.page) filter.page = q.page;
    if (q.limit) filter.limit = q.limit;
    if (q.priority !== undefined) filter.priority = q.priority;
    if (q.dueBefore) filter.dueBefore = new Date(q.dueBefore);
    if (q.dueAfter) filter.dueAfter = new Date(q.dueAfter);
    if (q.includeUndated === 'true') filter.includeUndated = true;
    if (q.excludeDone === 'true') filter.excludeDone = true;
    return this.taskService.findAll(filter);
  }

  @Get(':id')
  async findById(@Param('id') id: number, @Request() req: any): Promise<Node> {
    await this.access.assertRead(req.user.userId, Number(id));
    const task = await this.taskService.findById(Number(id));
    if (!task) throw new NotFoundException();
    return task;
  }

  @Post()
  async create(@Body() body: TaskCreateDto, @Request() req: any): Promise<Node> {
    const data = this.taskService.normalizeTaskPayload(this.access.sanitize(body));
    await this.access.assertCanUseAsParent(req.user.userId, data.parentId);
    return this.taskService.create({ ...data, createdBy: req.user.userId });
  }

  @Post('bulk')
  async bulkUpdate(@Body() body: BulkTaskUpdateDto, @Request() req: any): Promise<Node[]> {
    const ids = body.ids;
    // Every task must be writable by the caller before anything is changed.
    for (const id of ids) {
      await this.requireTask(id);
      await this.access.assertWrite(req.user.userId, id);
    }
    const data = this.taskService.normalizeTaskPayload(this.access.sanitize(body.data ?? {}));
    delete (data as any).type;
    if (data.parentId !== undefined) {
      await this.access.assertCanUseAsParent(req.user.userId, data.parentId);
      for (const id of ids) await this.access.assertNoCycle(id, Number(data.parentId));
    }
    return this.taskService.bulkUpdate(ids, data, req.user.userId);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: TaskUpdateDto, @Request() req: any): Promise<Node> {
    const existing = await this.requireTask(id);
    await this.access.assertWrite(req.user.userId, existing.id);
    // Prevent mass-assignment of ownership/identity fields; type is immutable.
    const safeBody = this.taskService.normalizeTaskPayload(this.access.sanitize(body));
    delete (safeBody as any).type;
    if (safeBody.parentId !== undefined && safeBody.parentId !== existing.parentId) {
      await this.access.assertCanUseAsParent(req.user.userId, safeBody.parentId, existing.id);
    }
    const task = await this.taskService.update(id, safeBody);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Put(':id/duplicate')
  async duplicate(@Param('id') id: number, @Request() req: any): Promise<Node> {
    await this.requireTask(id);
    await this.access.assertWrite(req.user.userId, Number(id));
    const task = await this.taskService.duplicate(Number(id), req.user.userId);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Post(':id/position')
  async updatePosition(@Param('id') id: number, @Body() body: TaskPositionDto, @Request() req: any): Promise<Node> {
    const existing = await this.requireTask(id);
    await this.access.assertWrite(req.user.userId, existing.id);
    const task = await this.taskService.updatePosition(id, body.position);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const existing = await this.requireTask(id);
    await this.access.assertWrite(req.user.userId, existing.id);
    return this.taskService.remove(id);
  }
}
