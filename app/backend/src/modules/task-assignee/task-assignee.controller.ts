import { Controller, Get, Post, Delete, Param, Body, Request, NotFoundException } from '@nestjs/common';
import { AddAssigneeDto } from './dto/task-links.dto';
import { NodeAccessService } from '../node/node-access.service';
import { TaskAssigneeService } from './task-assignee.service';
import { TaskService } from '../task/task.service';
import { TaskAssignee } from './task-assignee.entity';
import { NotificationService } from '../notification/notification.service';

@Controller('tasks/:taskId/assignees')
export class TaskAssigneeController {
  constructor(
    private readonly taskAssigneeService: TaskAssigneeService,
    private readonly taskService: TaskService,
    private readonly access: NodeAccessService,
    private readonly notifications: NotificationService,
  ) {}

  @Get()
  async findAll(@Param('taskId') taskId: number, @Request() req: any): Promise<TaskAssignee[]> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertRead(req.user.userId, Number(taskId));
    return this.taskAssigneeService.findByTask(taskId);
  }

  @Post()
  async add(@Param('taskId') taskId: number, @Body() body: AddAssigneeDto, @Request() req: any): Promise<TaskAssignee> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    const assignee = await this.taskAssigneeService.add(taskId, body.userId);
    void this.notifications.notify({
      type: 'task_assigned',
      recipients: [body.userId],
      actorId: req.user.userId,
      actorName: req.user.username,
      nodeId: Number(taskId),
      kind: 'task',
      title: task.title ?? '',
    });
    return assignee;
  }

  @Delete(':userId')
  async remove(@Param('taskId') taskId: number, @Param('userId') userId: number, @Request() req: any): Promise<void> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    return this.taskAssigneeService.remove(taskId, userId);
  }
}
