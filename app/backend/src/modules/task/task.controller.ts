import type { AuthRequest } from '../../common/auth-user';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskService, TaskFilter, TaskOccurrence, TaskWithProject } from './task.service';
import { Node, NodeType } from '../node/node.entity';
import { Access, NodeAccessService } from '../node/node-access.service';
import { TaskAssignee } from '../task-assignee/task-assignee.entity';
import { TeamService } from '../team/team.service';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notification/notification.service';
import {
  TaskCreateDto,
  TaskUpdateDto,
  BulkTaskUpdateDto,
  TaskListQueryDto,
  TaskOccurrencesQueryDto,
  TaskPositionDto,
} from '../node/dto/node.dto';

const MAX_OCCURRENCE_RANGE_MS = 100 * 24 * 3600 * 1000;

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly access: NodeAccessService,
    @InjectRepository(TaskAssignee)
    private readonly assignees: Repository<TaskAssignee>,
    private readonly teams: TeamService,
    private readonly users: UserService,
    private readonly notifications: NotificationService,
  ) {}

  /** Load a node and require it to be a task: /tasks/* must never act on projects. */
  private async requireTask(id: number): Promise<Node> {
    const node = await this.taskService.findById(Number(id));
    if (!node || node.type !== NodeType.TASK) throw new NotFoundException();
    return node;
  }

  @Get()
  async findAll(@Request() req: AuthRequest, @Query() q: TaskListQueryDto): Promise<TaskWithProject[]> {
    const filter: TaskFilter = { userId: req.user.userId };
    if (q.projectId) filter.projectId = q.projectId;
    if (q.parentTaskId !== undefined) filter.parentTaskId = q.parentTaskId;
    if (q.status) filter.status = q.status;
    if (q.search) filter.search = q.search;
    if (q.sort) filter.sort = q.sort;
    if (q.order) filter.order = q.order;
    if (q.page) filter.page = q.page;
    if (q.limit) filter.limit = q.limit;
    if (q.priority !== undefined) filter.priority = q.priority;
    if (q.dueBefore) filter.dueBefore = new Date(q.dueBefore);
    if (q.dueAfter) filter.dueAfter = new Date(q.dueAfter);
    if (q.includeUndated === 'true') filter.includeUndated = true;
    if (q.excludeDone === 'true') filter.excludeDone = true;
    return this.taskService.findAll(filter);
  }

  /** Future cycles of repeating tasks in a date range (at most 100 days), for calendars. */
  @Get('occurrences')
  async occurrences(@Request() req: AuthRequest, @Query() q: TaskOccurrencesQueryDto): Promise<TaskOccurrence[]> {
    const from = new Date(q.from);
    const to = new Date(q.to);
    if (to.getTime() < from.getTime() || to.getTime() - from.getTime() > MAX_OCCURRENCE_RANGE_MS) {
      throw new BadRequestException('Range must be between 0 and 100 days');
    }
    return this.taskService.occurrences(req.user.userId, from, to, q.projectId);
  }

  @Get(':id')
  async findById(@Param('id') id: number, @Request() req: AuthRequest): Promise<Node> {
    await this.access.assertRead(req.user.userId, Number(id));
    const task = await this.taskService.findById(Number(id));
    if (!task) throw new NotFoundException();
    return task;
  }

  @Post()
  async create(@Body() body: TaskCreateDto, @Request() req: AuthRequest): Promise<Node> {
    const { assigneeId, ...rest } = body;
    const data = this.taskService.normalizeTaskPayload(this.access.sanitize(rest));
    await this.access.assertCanUseAsParent(req.user.userId, data.parentId);
    const assignee = assigneeId ?? req.user.userId;
    if (assignee !== req.user.userId) await this.assertCanAssign(req.user.userId, assignee, data.parentId);
    const task = await this.taskService.create({ ...data, createdBy: req.user.userId }, req.user.userId);
    // Every new task is assigned: to its creator unless they picked someone else.
    await this.assignees.save(this.assignees.create({ node: { id: task.id }, user: { id: assignee } }));
    if (assignee !== req.user.userId) {
      void this.notifications.notify({
        type: 'task_assigned',
        recipients: [assignee],
        actorId: req.user.userId,
        actorName: req.user.username,
        nodeId: task.id,
        kind: 'task',
        title: task.title ?? '',
      });
    }
    return task;
  }

  /**
   * Another user may be assigned a new task when they can read its project, or (personal task)
   * when they are a member of a team the creator manages.
   */
  private async assertCanAssign(callerId: number, assigneeId: number, parentId?: number | null): Promise<void> {
    await this.users.assertActive(assigneeId);
    const allowed =
      parentId != null
        ? (await this.access.level(assigneeId, Number(parentId))) >= Access.READ
        : await this.teams.isSelfOrManagedTeamMember(callerId, assigneeId);
    if (!allowed) throw new ForbiddenException('You cannot assign this task to that user');
  }

  @Post('bulk')
  async bulkUpdate(@Body() body: BulkTaskUpdateDto, @Request() req: AuthRequest): Promise<Node[]> {
    const ids = body.ids;
    // Every task must be writable by the caller before anything is changed.
    for (const id of ids) {
      await this.requireTask(id);
      await this.access.assertWrite(req.user.userId, id);
    }
    const data = this.taskService.normalizeTaskPayload(this.access.sanitize(body.data ?? {}));
    delete data.type;
    if (data.parentId !== undefined) {
      await this.access.assertCanUseAsParent(req.user.userId, data.parentId);
      for (const id of ids) await this.access.assertNoCycle(id, Number(data.parentId));
    }
    return this.taskService.bulkUpdate(ids, data, req.user.userId);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: TaskUpdateDto, @Request() req: AuthRequest): Promise<Node> {
    const existing = await this.requireTask(id);
    await this.access.assertWrite(req.user.userId, existing.id);
    // Prevent mass-assignment of ownership/identity fields; type is immutable.
    const safeBody = this.taskService.normalizeTaskPayload(this.access.sanitize(body));
    delete safeBody.type;
    if (safeBody.parentId !== undefined && safeBody.parentId !== existing.parentId) {
      await this.access.assertCanUseAsParent(req.user.userId, safeBody.parentId, existing.id);
    }
    const task = await this.taskService.update(id, safeBody, req.user.userId);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Put(':id/duplicate')
  async duplicate(@Param('id') id: number, @Request() req: AuthRequest): Promise<Node> {
    await this.requireTask(id);
    await this.access.assertWrite(req.user.userId, Number(id));
    const task = await this.taskService.duplicate(Number(id), req.user.userId);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Post(':id/position')
  async updatePosition(
    @Param('id') id: number,
    @Body() body: TaskPositionDto,
    @Request() req: AuthRequest,
  ): Promise<Node> {
    const existing = await this.requireTask(id);
    await this.access.assertWrite(req.user.userId, existing.id);
    const task = await this.taskService.updatePosition(id, body.position);
    if (!task) throw new NotFoundException();
    return task;
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    const existing = await this.requireTask(id);
    await this.access.assertWrite(req.user.userId, existing.id);
    return this.taskService.remove(id, req.user.userId);
  }
}
