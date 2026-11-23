import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Access, NodeAccessService } from './node-access.service';
import { Node, NodeType } from './node.entity';
import { NodeService } from './node.service';
import { trashRoots } from './node-sql';
import { sqlRunner } from '../../common/sql';

const DEFAULT_RETENTION_DAYS = 30;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
const MAX_ROWS = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

export function trashRetentionDays(env: string | undefined = process.env.TRASH_RETENTION_DAYS): number {
  const n = Number(env);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_RETENTION_DAYS;
}

/** One deleted task or project that can be restored (the top of what was deleted together). */
export interface TrashEntry {
  id: number;
  type: 'task' | 'project';
  title: string | null;
  parentId: number | null;
  deletedAt: Date;
  deletedBy: { id: number | null; username: string | null };
  /** When it will be deleted for good. */
  purgeAt: Date;
}

/** The trash: what a user may see and restore, and the hourly removal of what has been there too long. */
@Injectable()
export class NodeTrashService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NodeTrashService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Node) private readonly repo: Repository<Node>,
    private readonly nodes: NodeService,
    private readonly access: NodeAccessService,
  ) {}

  onModuleInit() {
    const purge = () =>
      this.nodes
        .purgeExpired(trashRetentionDays())
        .then((n) => n && this.logger.log(`Removed ${n} expired trashed node${n === 1 ? '' : 's'}`))
        .catch((e) => this.logger.warn(`Trash purge failed: ${(e as Error).message}`));
    void purge();
    this.timer = setInterval(purge, PURGE_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Newest first. A user sees what they deleted or created or own, plus what others deleted directly
   * under a project they belong to, and only while they still hold the right to delete it
   * (write access for a task, manager for a project).
   */
  async list(userId: number): Promise<TrashEntry[]> {
    const rows = await trashRoots(sqlRunner(this.repo.manager), userId, MAX_ROWS);
    const retention = trashRetentionDays() * DAY_MS;
    const out: TrashEntry[] = [];
    for (const r of rows) {
      const needed = r.type === NodeType.PROJECT ? Access.ADMIN : Access.WRITE;
      if ((await this.access.level(userId, r.id, true)) < needed) continue;
      const deletedAt = new Date(r.deletedAt);
      out.push({
        id: r.id,
        type: r.type,
        title: r.name ?? r.title,
        parentId: r.parentId,
        deletedAt,
        deletedBy: { id: r.deletedBy, username: r.deletedByName },
        purgeAt: new Date(deletedAt.getTime() + retention),
      });
    }
    return out;
  }
}
