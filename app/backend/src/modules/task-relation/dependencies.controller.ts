import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, Query, Request } from '@nestjs/common';
import { Access, NodeAccessService } from '../node/node-access.service';
import { TaskRelationService, dependencyEdge } from './task-relation.service';
import { RelationKind } from './task-relation.entity';
import { DependenciesQueryDto } from './dto/dependencies.dto';

/** One dependency between two tasks: `toId` cannot start before `fromId` is finished. */
export interface TaskDependency {
  fromId: number;
  toId: number;
  /** The relation rows behind it (a pair may be stored as `blocks` and as `blocked_by`); removing it removes all. */
  rows: { taskId: number; kind: RelationKind; relatedTaskId: number }[];
}

export interface DependencyData {
  dependencies: TaskDependency[];
  /** The asked-for tasks the caller may change (move, resize, link). */
  editable: number[];
}

@Controller('dependencies')
export class DependenciesController {
  constructor(
    private readonly relations: TaskRelationService,
    private readonly access: NodeAccessService,
  ) {}

  /**
   * The dependencies touching the given tasks (only those whose two tasks the caller can read), and which of
   * the given tasks the caller may edit. A dependency to a task outside the list is included too, so a big view
   * can ask in chunks without losing the ones that cross chunks; the client keeps what it shows.
   */
  @Get()
  async get(@Query() q: DependenciesQueryDto, @Request() req: AuthRequest): Promise<DependencyData> {
    const userId = req.user.userId;
    const asked = await this.access.levels(userId, q.taskIds);
    const readable = [...asked].filter(([, l]) => l >= Access.READ).map(([id]) => id);
    const editable = [...asked].filter(([, l]) => l >= Access.WRITE).map(([id]) => id);

    const rows = await this.relations.dependenciesTouching(readable);
    const known = new Set(readable);
    const others = [
      ...new Set(rows.flatMap((r) => [r.node?.id, r.relatedNode?.id]).filter((id): id is number => id != null)),
    ].filter((id) => !known.has(id));
    const otherLevels = await this.access.levels(userId, others);
    const canRead = (id: number) => known.has(id) || (otherLevels.get(id) ?? Access.NONE) >= Access.READ;

    const byPair = new Map<string, TaskDependency>();
    for (const r of rows) {
      const taskId = r.node?.id;
      const relatedTaskId = r.relatedNode?.id;
      if (taskId == null || relatedTaskId == null || !canRead(taskId) || !canRead(relatedTaskId)) continue;
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
