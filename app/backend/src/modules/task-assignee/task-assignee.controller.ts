import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskAssigneeService } from './task-assignee.service';
import { TaskAssignee } from './task-assignee.entity';

@Controller('tasks/:taskId/assignees')
export class TaskAssigneeController {
  constructor(private readonly taskAssigneeService: TaskAssigneeService) {}

  @Get()
  async findAll(@Param('taskId') taskId: number): Promise<TaskAssignee[]> {
    return this.taskAssigneeService.findByTask(taskId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async add(@Param('taskId') taskId: number, @Body() body: { userId: number }): Promise<TaskAssignee> {
    return this.taskAssigneeService.add(taskId, body.userId);
  }

  @Delete(':userId')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('taskId') taskId: number, @Param('userId') userId: number): Promise<void> {
    return this.taskAssigneeService.remove(taskId, userId);
  }
}
