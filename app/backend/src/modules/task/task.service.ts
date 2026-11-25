/**
 * Compatibility shim — delegates to NodeService filtering by type='task'.
 * All existing TaskController routes continue to work unchanged.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { NodeService, NodeFilter } from '../node/node.service';
import { Node, NodeType, NodeStatus } from '../node/node.entity';
import { normalizeParentRefs } from '../node/node-payload';
import { occurrencesBetween } from '../node/node-recurrence';

// Re-export the shape consumers expect
export type Task = Node;

export interface TaskFilter {
  userId?: number;
  projectId?: number;
  parentTaskId?: number;
  status?: NodeStatus;
  search?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  priority?: number;
  dueBefore?: Date;
  dueAfter?: Date;
  includeUndated?: boolean;
  excludeDone?: boolean;
}

/** A future cycle of a repeating task (read-only: the task itself holds only its current cycle). */
export interface TaskOccurrence {
  taskId: number;
  title: string | null;
  dueDate: Date;
  startDate: Date | null;
  status: NodeStatus | null;
  priority: number | null;
  projectId: number | null;
}

/** A task as listed: with the project it belongs to (null: a personal task). */
export type TaskWithProject = Node & { projectId: number | null };

@Injectable()
export class TaskService {
  constructor(private readonly nodeService: NodeService) {}

  normalizeTaskPayload(data: object): Partial<Node> {
    return normalizeParentRefs(data);
  }

  /**
   * Tasks matching the filter, each with the project it belongs to (`projectId`, also for subtasks;
   * null for personal tasks), so lists can group them without walking the tree themselves.
   */
  async findAll(filter?: TaskFilter): Promise<TaskWithProject[]> {
    const nodeFilter: NodeFilter = { type: NodeType.TASK };
    if (filter?.userId !== undefined) nodeFilter.userId = filter.userId;
    if (filter?.projectId !== undefined) nodeFilter.parentId = filter.projectId;
    if (filter?.parentTaskId !== undefined) nodeFilter.parentId = filter.parentTaskId;
    if (filter?.status) nodeFilter.status = filter.status;
    if (filter?.search) nodeFilter.search = filter.search;
    if (filter?.sort) nodeFilter.sort = filter.sort;
    if (filter?.order) nodeFilter.order = filter.order;
    if (filter?.page) nodeFilter.page = filter.page;
    if (filter?.limit) nodeFilter.limit = filter.limit;
    if (filter?.priority !== undefined) nodeFilter.priority = filter.priority;
    if (filter?.dueBefore) nodeFilter.dueBefore = filter.dueBefore;
    if (filter?.dueAfter) nodeFilter.dueAfter = filter.dueAfter;
    if (filter?.includeUndated) nodeFilter.includeUndated = true;
    if (filter?.excludeDone) nodeFilter.excludeDone = true;
    const tasks = await this.nodeService.findAll(nodeFilter);
    const projects = await this.nodeService.projectIdsOf(tasks.map((t) => t.id));
    return tasks.map((t) => Object.assign(t, { projectId: projects.get(t.id) ?? null }));
  }

  /** Future cycles of the user's visible repeating tasks that fall between `from` and `to`. */
  async occurrences(userId: number, from: Date, to: Date, projectId?: number): Promise<TaskOccurrence[]> {
    const tasks = await this.nodeService.findAll({
      type: NodeType.TASK,
      userId,
      recurringOnly: true,
      excludeDone: true,
      dueBefore: to,
      ...(projectId !== undefined ? { parentId: projectId } : {}),
    });
    const timeZone = await this.nodeService.userTimeZone(userId);
    const projects = await this.nodeService.projectIdsOf(tasks.map((t) => t.id));
    return tasks.flatMap((t) =>
      occurrencesBetween(t, from, to, timeZone).map((o) => ({
        taskId: t.id,
        title: t.title ?? null,
        dueDate: o.dueDate,
        startDate: o.startDate ?? null,
        status: t.status ?? null,
        priority: t.priority ?? null,
        projectId: projects.get(t.id) ?? null,
      })),
    );
  }

  async findById(id: number): Promise<Node | null> {
    return this.nodeService.findById(id);
  }

  async create(data: Partial<Node>, actorId?: number): Promise<Node> {
    return this.nodeService.create({ ...this.normalizeTaskPayload(data), type: NodeType.TASK }, actorId);
  }

  async update(id: number, data: Partial<Node>, actorId?: number): Promise<Node | null> {
    return this.nodeService.update(id, this.normalizeTaskPayload(data), actorId);
  }

  async duplicate(id: number, createdBy?: number): Promise<Node | null> {
    return this.nodeService.duplicate(id, createdBy ?? 0);
  }

  async updatePosition(id: number, position: number): Promise<Node | null> {
    return this.nodeService.update(id, { position });
  }

  async bulkUpdate(ids: number[], data: Partial<Node>, userId?: number): Promise<Node[]> {
    const normalizedData = this.normalizeTaskPayload(data);
    if (!Object.keys(normalizedData).length) throw new BadRequestException('No fields to update');
    return this.nodeService.updateMany(ids, normalizedData, userId);
  }

  async remove(id: number, actorId?: number): Promise<void> {
    return this.nodeService.remove(id, actorId);
  }
}
