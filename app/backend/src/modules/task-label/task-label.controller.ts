import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskLabelService } from './task-label.service';
import { TaskLabel } from './task-label.entity';

@Controller('tasks/:taskId/labels')
export class TaskLabelController {
  constructor(private readonly taskLabelService: TaskLabelService) {}

  @Get()
  async findAll(@Param('taskId') taskId: number): Promise<TaskLabel[]> {
    return this.taskLabelService.findByTask(taskId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async add(@Param('taskId') taskId: number, @Body() body: { labelId: number }): Promise<TaskLabel> {
    return this.taskLabelService.add(taskId, body.labelId);
  }

  @Delete(':labelId')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('taskId') taskId: number, @Param('labelId') labelId: number): Promise<void> {
    return this.taskLabelService.remove(taskId, labelId);
  }
}
