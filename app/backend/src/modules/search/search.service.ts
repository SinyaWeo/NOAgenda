import { Injectable } from '@nestjs/common';
import { NodeService } from '../node/node.service';
import { NodeType } from '../node/node.entity';

@Injectable()
export class SearchService {
  constructor(private readonly nodeService: NodeService) {}

  /** Search only among projects and tasks the given user can access. */
  async search(userId: number, q: string) {
    const [tasks, projects] = await Promise.all([
      this.nodeService.findAll({ userId, type: NodeType.TASK, search: q, limit: 10 }),
      this.nodeService.findAll({ userId, type: NodeType.PROJECT, search: q, limit: 10 }),
    ]);
    return { tasks, projects };
  }
}
