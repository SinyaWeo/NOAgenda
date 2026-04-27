import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskReminderService } from './task-reminder.service';
import { TaskService } from '../task/task.service';
import { TaskReminder } from './task-reminder.entity';

@Controller('tasks/:taskId/reminders')
export class TaskReminderController {
  constructor(
    private readonly taskReminderService: TaskReminderService,
    private readonly taskService: TaskService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Param('taskId') taskId: number, @Request() req: any): Promise<TaskReminder[]> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    if (task.createdBy !== undefined && task.createdBy !== req.user.userId) throw new ForbiddenException();
    return this.taskReminderService.findByTask(taskId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Param('taskId') taskId: number,
    @Body() body: { reminderDate: string },
    @Request() req: any,
  ): Promise<TaskReminder> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    if (task.createdBy !== undefined && task.createdBy !== req.user.userId) throw new ForbiddenException();
    return this.taskReminderService.create(taskId, new Date(body.reminderDate));
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('taskId') taskId: number, @Param('id') id: number, @Request() req: any): Promise<void> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    if (task.createdBy !== undefined && task.createdBy !== req.user.userId) throw new ForbiddenException();
    return this.taskReminderService.remove(id);
  }
}
