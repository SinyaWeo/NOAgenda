import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, Post, Delete, Param, Body, Request, NotFoundException } from '@nestjs/common';
import { AddTaskLabelDto } from '../task-assignee/dto/task-links.dto';
import { NodeAccessService } from '../node/node-access.service';
import { TaskLabelService } from './task-label.service';
import { TaskService } from '../task/task.service';
import { LabelService } from '../label/label.service';
import { TaskLabel } from './task-label.entity';
import { DomainEvents } from '../../common/domain-events';

@Controller('tasks/:taskId/labels')
export class TaskLabelController {
  constructor(
    private readonly taskLabelService: TaskLabelService,
    private readonly taskService: TaskService,
    private readonly access: NodeAccessService,
    private readonly labels: LabelService,
    private readonly events: DomainEvents,
  ) {}

  private audit(
    task: { id: number; title?: string; createdBy?: number },
    actorId: number,
    from: string | null,
    to: string | null,
  ) {
    this.events.emit({
      name: 'task.label_changed',
      data: { taskId: task.id },
      nodeId: task.id,
      owner: task.createdBy ?? null,
      actorId,
      title: task.title ?? null,
      changes: { label: { from, to } },
      auditOnly: true,
    });
  }

  @Get()
  async findAll(@Param('taskId') taskId: number, @Request() req: AuthRequest): Promise<TaskLabel[]> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertRead(req.user.userId, Number(taskId));
    return this.taskLabelService.findByTask(taskId);
  }

  @Post()
  async add(
    @Param('taskId') taskId: number,
    @Body() body: AddTaskLabelDto,
    @Request() req: AuthRequest,
  ): Promise<TaskLabel> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    // Labels are per-user: you can only attach your own (no probing other users' labels).
    const label = await this.labels.findById(body.labelId);
    if (!label || label.createdBy !== req.user.userId) throw new NotFoundException();
    const added = await this.taskLabelService.add(taskId, body.labelId);
    this.audit(task, req.user.userId, null, label.title ?? null);
    return added;
  }

  @Delete(':labelId')
  async remove(
    @Param('taskId') taskId: number,
    @Param('labelId') labelId: number,
    @Request() req: AuthRequest,
  ): Promise<void> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    const label = await this.labels.findById(Number(labelId));
    await this.taskLabelService.remove(taskId, labelId);
    this.audit(task, req.user.userId, label?.title ?? null, null);
  }
}
