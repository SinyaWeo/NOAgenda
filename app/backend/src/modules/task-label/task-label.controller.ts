import { Controller, Get, Post, Delete, Param, Body, Request, NotFoundException } from '@nestjs/common';
import { AddTaskLabelDto } from '../task-assignee/dto/task-links.dto';
import { NodeAccessService } from '../node/node-access.service';
import { TaskLabelService } from './task-label.service';
import { TaskService } from '../task/task.service';
import { LabelService } from '../label/label.service';
import { TaskLabel } from './task-label.entity';

@Controller('tasks/:taskId/labels')
export class TaskLabelController {
  constructor(
    private readonly taskLabelService: TaskLabelService,
    private readonly taskService: TaskService,
    private readonly access: NodeAccessService,
    private readonly labels: LabelService,
  ) {}

  @Get()
  async findAll(@Param('taskId') taskId: number, @Request() req: any): Promise<TaskLabel[]> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertRead(req.user.userId, Number(taskId));
    return this.taskLabelService.findByTask(taskId);
  }

  @Post()
  async add(@Param('taskId') taskId: number, @Body() body: AddTaskLabelDto, @Request() req: any): Promise<TaskLabel> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    // Labels are per-user: you can only attach your own (no probing other users' labels).
    const label = await this.labels.findById(body.labelId);
    if (!label || label.createdBy !== req.user.userId) throw new NotFoundException();
    return this.taskLabelService.add(taskId, body.labelId);
  }

  @Delete(':labelId')
  async remove(@Param('taskId') taskId: number, @Param('labelId') labelId: number, @Request() req: any): Promise<void> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    return this.taskLabelService.remove(taskId, labelId);
  }
}
