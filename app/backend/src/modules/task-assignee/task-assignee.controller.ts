import type { AuthRequest } from '../../common/auth-user';
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AddAssigneeDto } from './dto/task-links.dto';
import { Access, NodeAccessService } from '../node/node-access.service';
import { TaskAssigneeService } from './task-assignee.service';
import { TaskService } from '../task/task.service';
import { TaskAssignee } from './task-assignee.entity';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service';

@Controller('tasks/:taskId/assignees')
export class TaskAssigneeController {
  constructor(
    private readonly taskAssigneeService: TaskAssigneeService,
    private readonly taskService: TaskService,
    private readonly access: NodeAccessService,
    private readonly notifications: NotificationService,
    private readonly users: UserService,
  ) {}

  @Get()
  async findAll(@Param('taskId') taskId: number, @Request() req: AuthRequest): Promise<TaskAssignee[]> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertRead(req.user.userId, Number(taskId));
    return this.taskAssigneeService.findByTask(taskId);
  }

  @Post()
  async add(
    @Param('taskId') taskId: number,
    @Body() body: AddAssigneeDto,
    @Request() req: AuthRequest,
  ): Promise<TaskAssignee> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    // Only real, active users who can already see the task: no notifying strangers.
    await this.users.assertActive(body.userId);
    if ((await this.access.level(body.userId, Number(taskId))) < Access.READ) {
      throw new BadRequestException('That user has no access to this task');
    }
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
  async remove(
    @Param('taskId') taskId: number,
    @Param('userId') userId: number,
    @Request() req: AuthRequest,
  ): Promise<void> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    return this.taskAssigneeService.remove(taskId, userId);
  }
}
