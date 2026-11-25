import type { AuthRequest } from '../../common/auth-user';
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { daysBeforeAt } from '../../common/zoned-time';
import { NodeService } from '../node/node.service';
import { AddReminderDto } from '../task-assignee/dto/task-links.dto';
import { NodeAccessService } from '../node/node-access.service';
import { TaskReminderService } from './task-reminder.service';
import { TaskService } from '../task/task.service';
import { TaskReminder } from './task-reminder.entity';

export const BOTH_KINDS = 'Give either a reminder date or days before the due date';
export const NO_DUE_DATE = 'Set a due date first';

@Controller('tasks/:taskId/reminders')
export class TaskReminderController {
  constructor(
    private readonly taskReminderService: TaskReminderService,
    private readonly taskService: TaskService,
    private readonly access: NodeAccessService,
    private readonly nodes: NodeService,
  ) {}

  @Get()
  async findAll(@Param('taskId') taskId: number, @Request() req: AuthRequest): Promise<TaskReminder[]> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertRead(req.user.userId, Number(taskId));
    return this.taskReminderService.findByTask(taskId);
  }

  @Post()
  async create(
    @Param('taskId') taskId: number,
    @Body() body: AddReminderDto,
    @Request() req: AuthRequest,
  ): Promise<TaskReminder> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    if (body.daysBefore === undefined) {
      return this.taskReminderService.create(taskId, new Date(body.reminderDate as string), req.user.userId);
    }
    if (body.reminderDate !== undefined) throw new BadRequestException(BOTH_KINDS);
    if (!task.dueDate) throw new BadRequestException(NO_DUE_DATE);
    // Counted in the creator's time zone, which is also used whenever the due date moves it later.
    const timeZone = await this.nodes.userTimeZone(req.user.userId);
    const atTime = body.atTime as string;
    const date = daysBeforeAt(new Date(task.dueDate), body.daysBefore, atTime, timeZone);
    return this.taskReminderService.create(taskId, date, req.user.userId, { daysBefore: body.daysBefore, atTime });
  }

  @Delete(':id')
  async remove(@Param('taskId') taskId: number, @Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    return this.taskReminderService.remove(Number(taskId), Number(id));
  }
}
