import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { TaskService, TaskFilter } from './task.service';
import { Task, TaskStatus } from './task.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  async findAll(
    @Query('projectId') projectId?: number,
    @Query('status') status?: TaskStatus,
    @Query('search') search?: string,
  ): Promise<Task[]> {
    const filter: TaskFilter = {};
    if (projectId) filter.projectId = Number(projectId);
    if (status) filter.status = status;
    if (search) filter.search = search;
    return this.taskService.findAll(filter);
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Task> {
    const task = await this.taskService.findById(id);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Task>): Promise<Task> {
    return this.taskService.create(body);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Task>): Promise<Task> {
    const task = await this.taskService.update(id, body);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number): Promise<void> {
    return this.taskService.remove(id);
  }
}
