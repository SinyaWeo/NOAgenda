/**
 * Compatibility shim — delegates to NodeService filtering by type='task'.
 * All existing TaskController routes continue to work unchanged.
 */
import { Injectable } from '@nestjs/common';
import { NodeService, NodeFilter } from '../node/node.service';
import { Node, NodeType, NodeStatus } from '../node/node.entity';

// Re-export the shape consumers expect
export type Task = Node;
export { NodeStatus as TaskStatus };

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
}

@Injectable()
export class TaskService {
  constructor(private readonly nodeService: NodeService) {}

  async findAll(filter?: TaskFilter): Promise<Node[]> {
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
    return this.nodeService.findAll(nodeFilter);
  }

  async findById(id: number): Promise<Node | null> {
    return this.nodeService.findById(id);
  }

  async create(data: Partial<Node>): Promise<Node> {
    return this.nodeService.create({ ...data, type: NodeType.TASK });
  }

  async update(id: number, data: Partial<Node>): Promise<Node | null> {
    return this.nodeService.update(id, data);
  }

  async duplicate(id: number, createdBy?: number): Promise<Node | null> {
    return this.nodeService.duplicate(id, createdBy ?? 0);
  }

  async updatePosition(id: number, position: number): Promise<Node | null> {
    return this.nodeService.update(id, { position });
  }

  async bulkUpdate(ids: number[], data: Partial<Node>, _userId?: number): Promise<Node[]> {
    const results = await Promise.all(ids.map((id) => this.nodeService.update(id, data)));
    return results.filter(Boolean) as Node[];
  }

  async remove(id: number): Promise<void> {
    return this.nodeService.remove(id);
  }
}
