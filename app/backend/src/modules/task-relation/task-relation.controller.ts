import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskRelationService } from './task-relation.service';
import { TaskRelation, RelationKind } from './task-relation.entity';

@Controller('tasks/:taskId/relations')
export class TaskRelationController {
  constructor(private readonly taskRelationService: TaskRelationService) {}

  @Get()
  async findAll(@Param('taskId') taskId: number): Promise<TaskRelation[]> {
    return this.taskRelationService.findByTask(taskId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Param('taskId') taskId: number,
    @Body() body: { relatedTaskId: number; kind: RelationKind },
  ): Promise<TaskRelation> {
    return this.taskRelationService.create(taskId, body.relatedTaskId, body.kind);
  }

  @Delete(':kind/:relatedTaskId')
  @UseGuards(AuthGuard('jwt'))
  async remove(
    @Param('taskId') taskId: number,
    @Param('relatedTaskId') relatedTaskId: number,
    @Param('kind') kind: RelationKind,
  ): Promise<void> {
    return this.taskRelationService.remove(taskId, relatedTaskId, kind);
  }
}
