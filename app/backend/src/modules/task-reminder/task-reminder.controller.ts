import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskReminderService } from './task-reminder.service';
import { TaskReminder } from './task-reminder.entity';

@Controller('tasks/:taskId/reminders')
export class TaskReminderController {
  constructor(private readonly taskReminderService: TaskReminderService) {}

  @Get()
  async findAll(@Param('taskId') taskId: number): Promise<TaskReminder[]> {
    return this.taskReminderService.findByTask(taskId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Param('taskId') taskId: number,
    @Body() body: { reminderDate: string },
  ): Promise<TaskReminder> {
    return this.taskReminderService.create(taskId, new Date(body.reminderDate));
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number): Promise<void> {
    return this.taskReminderService.remove(id);
  }
}
