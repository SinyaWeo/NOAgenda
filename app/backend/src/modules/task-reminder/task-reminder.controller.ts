import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AddReminderDto } from '../task-assignee/dto/task-links.dto';
import { NodeAccessService } from '../node/node-access.service';
import { TaskReminderService } from './task-reminder.service';
import { TaskService } from '../task/task.service';
import { TaskReminder } from './task-reminder.entity';

@Controller('tasks/:taskId/reminders')
export class TaskReminderController {
  constructor(
    private readonly taskReminderService: TaskReminderService,
    private readonly taskService: TaskService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Param('taskId') taskId: number, @Request() req: any): Promise<TaskReminder[]> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertRead(req.user.userId, Number(taskId));
    return this.taskReminderService.findByTask(taskId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Param('taskId') taskId: number,
    @Body() body: AddReminderDto,
    @Request() req: any,
  ): Promise<TaskReminder> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    return this.taskReminderService.create(taskId, new Date(body.reminderDate));
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('taskId') taskId: number, @Param('id') id: number, @Request() req: any): Promise<void> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    return this.taskReminderService.remove(Number(taskId), Number(id));
  }
}
