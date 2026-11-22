import type { AuthRequest } from '../../common/auth-user';
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AddRelationDto } from '../task-assignee/dto/task-links.dto';
import { Access, NodeAccessService } from '../node/node-access.service';
import { TaskRelationService } from './task-relation.service';
import { TaskService } from '../task/task.service';
import { TaskRelation, RelationKind } from './task-relation.entity';
import { DomainEvents } from '../../common/domain-events';

@Controller('tasks/:taskId/relations')
export class TaskRelationController {
  constructor(
    private readonly taskRelationService: TaskRelationService,
    private readonly taskService: TaskService,
    private readonly access: NodeAccessService,
    private readonly events: DomainEvents,
  ) {}

  private async audit(
    task: { id: number; title?: string; createdBy?: number },
    actorId: number,
    relatedTaskId: number,
    kind: RelationKind,
    added: boolean,
  ) {
    const other = await this.taskService.findById(Number(relatedTaskId));
    const value = { kind, taskId: Number(relatedTaskId), title: other?.title ?? null };
    this.events.emit({
      name: 'task.relation_changed',
      data: { taskId: task.id },
      nodeId: task.id,
      owner: task.createdBy ?? null,
      actorId,
      title: task.title ?? null,
      changes: { relation: added ? { from: null, to: value } : { from: value, to: null } },
      auditOnly: true,
    });
  }

  @Get()
  async findAll(@Param('taskId') taskId: number, @Request() req: AuthRequest): Promise<TaskRelation[]> {
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
    @Request() req: AuthRequest,
  ): Promise<TaskRelation> {
    if (Number(body.relatedTaskId) === Number(taskId))
      throw new BadRequestException('A task cannot be related to itself');
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    await this.access.assertRead(req.user.userId, Number(body.relatedTaskId));
    const created = await this.taskRelationService.create(taskId, body.relatedTaskId, body.kind);
    await this.audit(task, req.user.userId, body.relatedTaskId, body.kind, true);
    return created;
  }

  @Delete(':kind/:relatedTaskId')
  async remove(
    @Param('taskId') taskId: number,
    @Param('relatedTaskId') relatedTaskId: number,
    @Param('kind') kind: RelationKind,
    @Request() req: AuthRequest,
  ): Promise<void> {
    const task = await this.taskService.findById(taskId);
    if (!task) throw new NotFoundException();
    await this.access.assertWrite(req.user.userId, Number(taskId));
    await this.taskRelationService.remove(taskId, relatedTaskId, kind);
    await this.audit(task, req.user.userId, relatedTaskId, kind, false);
  }
}
