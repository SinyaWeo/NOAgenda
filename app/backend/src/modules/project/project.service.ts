/**
 * Compatibility shim — delegates to NodeService filtering by type='project'.
 * All existing ProjectController routes continue to work unchanged.
 */
import { Injectable } from '@nestjs/common';
import { NodeService } from '../node/node.service';
import { Node, NodeType } from '../node/node.entity';

// Re-export the shape consumers expect
export type Project = Node;

@Injectable()
export class ProjectService {
  constructor(private readonly nodeService: NodeService) {}

  async findAll(userId: number, includeArchived = false): Promise<Node[]> {
    return this.nodeService.findAll({ userId, type: NodeType.PROJECT, includeArchived });
  }

  async findById(id: number): Promise<Node | null> {
    return this.nodeService.findById(id);
  }

  async create(data: Partial<Node>): Promise<Node> {
    return this.nodeService.create({ ...data, type: NodeType.PROJECT });
  }

  async update(id: number, data: Partial<Node>): Promise<Node | null> {
    return this.nodeService.update(id, data);
  }

  async duplicate(id: number, ownerId: number): Promise<Node | null> {
    return this.nodeService.duplicate(id, ownerId);
  }

  async remove(id: number): Promise<void> {
    return this.nodeService.remove(id);
  }

  async archive(id: number): Promise<Node | null> {
    return this.nodeService.archive(id);
  }

  async unarchive(id: number): Promise<Node | null> {
    return this.nodeService.unarchive(id);
  }
}
