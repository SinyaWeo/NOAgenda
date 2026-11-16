import { Controller, Get, Post, Delete, Param, Body, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AddRelationDto } from '../task-assignee/dto/task-links.dto';
import { Access, NodeAccessService } from '../node/node-access.service';
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
  async findAll(@Param('taskId') taskId: number, @Request() req: any): Promise<TaskRelation[]> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertRead(req.user.userId, Number(taskId));
    const relations = await this.taskRelationService.findByTask(taskId);
    const visible: TaskRelation[] = [];
    for (const r of relations) {
      const otherId = Number(r.node?.id) === Number(taskId) ? r.relatedNode?.id : r.node?.id;
      if (otherId != null && (await this.access.level(req.user.userId, otherId)) >= Access.READ) visible.push(r);
    }
    return visible;
  }

  @Post()
  async create(
    @Param('taskId') taskId: number,
    @Body() body: AddRelationDto,
    @Request() req: any,
  ): Promise<TaskRelation> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    await this.access.assertRead(req.user.userId, Number(body.relatedTaskId));
    return this.taskRelationService.create(taskId, body.relatedTaskId, body.kind);
  }

  @Delete(':kind/:relatedTaskId')
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
