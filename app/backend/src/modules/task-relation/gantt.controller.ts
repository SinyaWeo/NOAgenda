import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, Query, Request } from '@nestjs/common';
import { Access, NodeAccessService } from '../node/node-access.service';
import { TaskRelationService, dependencyEdge } from './task-relation.service';
import { RelationKind } from './task-relation.entity';
import { GanttQueryDto } from './dto/gantt.dto';

/** One arrow in the chart: `toId` cannot start before `fromId` ends. */
export interface GanttDependency {
  fromId: number;
  toId: number;
  /** The relation rows behind it (a pair may be stored as `blocks` and as `blocked_by`); removing the arrow removes all. */
  rows: { taskId: number; kind: RelationKind; relatedTaskId: number }[];
}

export interface GanttData {
  dependencies: GanttDependency[];
  /** The asked-for tasks the caller may change (move, resize, link). */
  editable: number[];
}

@Controller('gantt')
export class GanttController {
  constructor(
    private readonly relations: TaskRelationService,
    private readonly access: NodeAccessService,
  ) {}

  /** Dependencies among the given tasks, and which of them the caller may edit. Unreadable tasks are ignored. */
  @Get()
  async get(@Query() q: GanttQueryDto, @Request() req: AuthRequest): Promise<GanttData> {
    const levels = await this.access.levels(req.user.userId, q.taskIds);
    const readable = [...levels].filter(([, l]) => l >= Access.READ).map(([id]) => id);
    const editable = [...levels].filter(([, l]) => l >= Access.WRITE).map(([id]) => id);
    const byPair = new Map<string, GanttDependency>();
    for (const r of await this.relations.dependenciesAmong(readable)) {
      const taskId = r.node?.id;
      const relatedTaskId = r.relatedNode?.id;
      if (taskId == null || relatedTaskId == null) continue;
      const edge = dependencyEdge(taskId, relatedTaskId, r.kind);
      if (!edge) continue;
      const key = `${edge.fromId}>${edge.toId}`;
      const dep = byPair.get(key) ?? { ...edge, rows: [] };
      dep.rows.push({ taskId, kind: r.kind, relatedTaskId });
      byPair.set(key, dep);
    }
    return { dependencies: [...byPair.values()], editable };
  }
}
