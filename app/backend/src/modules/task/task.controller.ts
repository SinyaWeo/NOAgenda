import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, NotFoundException, ForbiddenException, Request } from '@nestjs/common';
import { TaskService, TaskFilter } from './task.service';
import { Task, TaskStatus } from './task.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(
    @Request() req: any,
    @Query('projectId') projectId?: number,
    @Query('parentTaskId') parentTaskId?: number,
    @Query('status') status?: TaskStatus,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<Task[]> {
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
  async findById(@Param('id') id: number, @Request() req: any): Promise<Task> {
    const task = await this.taskService.findById(id);
    if (!task) throw new NotFoundException();
    // Creator always has access
    if (task.createdBy === req.user.userId) return task;
    // Otherwise verify the task is in a project the user has access to
    if (task.project?.id) {
      const accessible = await this.taskService.findAll({ userId: req.user.userId, projectId: task.project.id });
      if (accessible.some((t) => t.id === Number(id))) return task;
    }
    throw new ForbiddenException();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Task>, @Request() req: any): Promise<Task> {
    return this.taskService.create({ ...body, createdBy: req.user.userId });
  }

  @Post('bulk')
  @UseGuards(AuthGuard('jwt'))
  async bulkUpdate(@Body() body: { ids: number[]; data: Partial<Task> }, @Request() req: any): Promise<Task[]> {
    return this.taskService.bulkUpdate(body.ids, body.data, req.user.userId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Task>, @Request() req: any): Promise<Task> {
    const existing = await this.taskService.findById(id);
    if (!existing) throw new NotFoundException();
    if (existing.createdBy !== undefined && existing.createdBy !== req.user.userId) {
      throw new ForbiddenException();
    }
    // Prevent mass-assignment of ownership/identity fields
    const { id: _id, createdBy: _cb, project: _p, ...safeBody } = body as any;
    const task = await this.taskService.update(id, safeBody);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Put(':id/duplicate')
  @UseGuards(AuthGuard('jwt'))
  async duplicate(@Param('id') id: number, @Request() req: any): Promise<Task> {
    const task = await this.taskService.duplicate(id, req.user.userId);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Post(':id/position')
  @UseGuards(AuthGuard('jwt'))
  async updatePosition(@Param('id') id: number, @Body() body: { position: number }, @Request() req: any): Promise<Task> {
    const existing = await this.taskService.findById(id);
    if (!existing) throw new NotFoundException();
    if (existing.createdBy !== undefined && existing.createdBy !== req.user.userId) throw new ForbiddenException();
    const task = await this.taskService.updatePosition(id, body.position);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Post(':id/read')
  @UseGuards(AuthGuard('jwt'))
  async markRead(@Param('id') id: number, @Request() req: any): Promise<Task> {
    const existing = await this.taskService.findById(id);
    if (!existing) throw new NotFoundException();
    if (existing.createdBy !== undefined && existing.createdBy !== req.user.userId) throw new ForbiddenException();
    const task = await this.taskService.update(id, { isUnread: false } as any);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const existing = await this.taskService.findById(id);
    if (!existing) throw new NotFoundException();
    if (existing.createdBy !== undefined && existing.createdBy !== req.user.userId) {
      throw new ForbiddenException();
    }
    return this.taskService.remove(id);
  }
}
