import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NodeAccessService } from '../node/node-access.service';
import { TaskAssigneeService } from './task-assignee.service';
import { TaskService } from '../task/task.service';
import { TaskAssignee } from './task-assignee.entity';

@Controller('tasks/:taskId/assignees')
export class TaskAssigneeController {
  constructor(
    private readonly taskAssigneeService: TaskAssigneeService,
    private readonly taskService: TaskService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Param('taskId') taskId: number, @Request() req: any): Promise<TaskAssignee[]> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertRead(req.user.userId, Number(taskId));
    return this.taskAssigneeService.findByTask(taskId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async add(@Param('taskId') taskId: number, @Body() body: { userId: number }, @Request() req: any): Promise<TaskAssignee> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    return this.taskAssigneeService.add(taskId, body.userId);
  }

  @Delete(':userId')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('taskId') taskId: number, @Param('userId') userId: number, @Request() req: any): Promise<void> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    return this.taskAssigneeService.remove(taskId, userId);
  }
}
