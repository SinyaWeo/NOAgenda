import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NodeAccessService } from '../node/node-access.service';
import { TaskRelationService } from './task-relation.service';
import { TaskService } from '../task/task.service';
import { TaskRelation, RelationKind } from './task-relation.entity';

@Controller('tasks/:taskId/relations')
export class TaskRelationController {
  constructor(
    private readonly taskRelationService: TaskRelationService,
    private readonly taskService: TaskService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Param('taskId') taskId: number, @Request() req: any): Promise<TaskRelation[]> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertRead(req.user.userId, Number(taskId));
    return this.taskRelationService.findByTask(taskId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Param('taskId') taskId: number,
    @Body() body: { relatedTaskId: number; kind: RelationKind },
    @Request() req: any,
  ): Promise<TaskRelation> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    await this.access.assertRead(req.user.userId, Number(body.relatedTaskId));
    return this.taskRelationService.create(taskId, body.relatedTaskId, body.kind);
  }

  @Delete(':kind/:relatedTaskId')
  @UseGuards(AuthGuard('jwt'))
  async remove(
    @Param('taskId') taskId: number,
    @Param('relatedTaskId') relatedTaskId: number,
    @Param('kind') kind: RelationKind,
    @Request() req: any,
  ): Promise<void> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    return this.taskRelationService.remove(taskId, relatedTaskId, kind);
  }
}
