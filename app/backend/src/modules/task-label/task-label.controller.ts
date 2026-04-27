import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskLabelService } from './task-label.service';
import { TaskService } from '../task/task.service';
import { TaskLabel } from './task-label.entity';

@Controller('tasks/:taskId/labels')
export class TaskLabelController {
  constructor(
    private readonly taskLabelService: TaskLabelService,
    private readonly taskService: TaskService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Param('taskId') taskId: number, @Request() req: any): Promise<TaskLabel[]> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    if (task.createdBy !== undefined && task.createdBy !== req.user.userId) throw new ForbiddenException();
    return this.taskLabelService.findByTask(taskId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async add(@Param('taskId') taskId: number, @Body() body: { labelId: number }, @Request() req: any): Promise<TaskLabel> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    if (task.createdBy !== undefined && task.createdBy !== req.user.userId) throw new ForbiddenException();
    return this.taskLabelService.add(taskId, body.labelId);
  }

  @Delete(':labelId')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('taskId') taskId: number, @Param('labelId') labelId: number, @Request() req: any): Promise<void> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    if (task.createdBy !== undefined && task.createdBy !== req.user.userId) throw new ForbiddenException();
    return this.taskLabelService.remove(taskId, labelId);
  }
}
