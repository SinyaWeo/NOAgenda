import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository, SelectQueryBuilder } from 'typeorm';
import { DomainEvent, DomainEvents } from '../../common/domain-events';
import { Node } from '../node/node.entity';
import { NodeService } from '../node/node.service';
import { Activity } from './activity.entity';

const DEFAULT_RETENTION_DAYS = 365;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
const PAGE = 30;
const MAX_TITLE = 255;

/** What the API returns for one entry. */
export interface ActivityEntry {
  id: number;
  createdAt: Date;
  action: string;
  nodeId: number;
  nodeType: string;
  nodeTitle: string | null;
  projectId: number | null;
  actor: { id: number | null; username: string | null };
  changes: Record<string, unknown> | null;
}

export interface ActivityPage {
  items: ActivityEntry[];
  /** Pass as `before` to get the next (older) page; null at the end. */
  next: number | null;
}

export interface AdminActivityFilter {
  actorId?: number;
  projectId?: number;
  nodeId?: number;
  action?: string;
  from?: Date;
  to?: Date;
}

export function retentionDays(env: string | undefined = process.env.ACTIVITY_RETENTION_DAYS): number {
  const n = Number(env);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_RETENTION_DAYS;
}

/**
 * The audit trail: listens to domain events and keeps one row per change, forever independent of the
 * node it is about (so a deleted task or project stays visible). Old rows are purged after the
 * retention period.
 */
@Injectable()
export class ActivityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivityService.name);
  private purgeTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Activity) private readonly repo: Repository<Activity>,
    private readonly events: DomainEvents,
    private readonly nodes: NodeService,
  ) {}

  onModuleInit() {
    this.events.on(async (e) => {
      try {
        await this.record(e);
      } catch (err) {
        this.logger.warn(`Could not record activity: ${(err as Error).message}`);
      }
    });
    const purge = () =>
      this.purgeOld()
        .then((n) => n && this.logger.log(`Removed ${n} expired activity entr${n === 1 ? 'y' : 'ies'}`))
        .catch((e) => this.logger.warn(`Activity purge failed: ${(e as Error).message}`));
    void purge();
    this.purgeTimer = setInterval(purge, PURGE_INTERVAL_MS);
    this.purgeTimer.unref();
  }

  onModuleDestroy() {
    if (this.purgeTimer) clearInterval(this.purgeTimer);
  }

  /** Delete entries older than the retention period; returns how many. */
  async purgeOld(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - retentionDays() * 24 * 60 * 60 * 1000);
    const res = await this.repo.delete({ createdAt: LessThan(cutoff) });
    return res.affected ?? 0;
  }

  /** Turn a domain event into a row. Does nothing for updates that changed nothing worth showing. */
  async record(e: DomainEvent): Promise<Activity | null> {
    if (e.name.endsWith('.updated') && e.changes && Object.keys(e.changes).length === 0) return null;
    const nodeType = e.name.startsWith('project.') ? 'project' : e.name.startsWith('idea.') ? 'idea' : 'task';
    const data = e.data ?? {};
    const projectId = e.projectId !== undefined ? e.projectId : await this.projectOf(e);
    const title = (data.title ?? data.name ?? e.title ?? null) as string | null;
    const row = this.repo.create({
      nodeId: e.nodeId,
      projectId,
      actorId: e.actorId ?? null,
      actorName: await this.usernameOf(e.actorId),
      ownerId: await this.ownerOf(e, projectId),
      nodeType,
      nodeTitle: typeof title === 'string' ? title.slice(0, MAX_TITLE) : null,
      action: e.name.slice(0, 50),
      changes: e.changes && Object.keys(e.changes).length ? e.changes : null,
    });
    return this.repo.save(row);
  }

  private async projectOf(e: DomainEvent): Promise<number | null> {
    const d = e.data ?? {};
    if (d.type && 'parentId' in d) {
      return this.nodes.projectIdOf({
        id: e.nodeId,
        type: d.type as 'project' | 'task',
        parentId: (d.parentId ?? null) as number | null,
      } as Parameters<NodeService['projectIdOf']>[0]);
    }
    const node = await this.nodes.findById(e.nodeId);
    return node ? this.nodes.projectIdOf(node) : null;
  }

  private async ownerOf(e: DomainEvent, projectId: number | null): Promise<number | null> {
    if (projectId == null || projectId === e.nodeId) return e.owner ?? null;
    const project = await this.nodes.findById(projectId);
    return project?.ownerId ?? e.owner ?? null;
  }

  private async usernameOf(userId?: number | null): Promise<string | null> {
    if (!userId) return null;
    const rows: { username: string }[] = await this.repo.manager.query('SELECT username FROM users WHERE id = ?', [
      userId,
    ]);
    return rows?.[0]?.username ?? null;
  }

  private toEntry(a: Activity): ActivityEntry {
    return {
      id: a.id,
      createdAt: a.createdAt,
      action: a.action,
      nodeId: a.nodeId,
      nodeType: a.nodeType,
      nodeTitle: a.nodeTitle,
      projectId: a.projectId,
      actor: { id: a.actorId, username: a.actorName },
      changes: a.changes,
    };
  }

  private async page(qb: SelectQueryBuilder<Activity>, before?: number, limit = PAGE): Promise<ActivityPage> {
    if (before) qb.andWhere('a.id < :before', { before });
    const rows = await qb
      .orderBy('a.id', 'DESC')
      .take(limit + 1)
      .getMany();
    const items = rows.slice(0, limit).map((r) => this.toEntry(r));
    return { items, next: rows.length > limit ? items[items.length - 1].id : null };
  }

  /** History of one existing node. The caller must already have checked read access. */
  forNode(nodeId: number, before?: number, limit?: number): Promise<ActivityPage> {
    return this.page(this.repo.createQueryBuilder('a').where('a.nodeId = :nodeId', { nodeId }), before, limit);
  }

  /** Everything that happened in a project (including to tasks that were since deleted). Caller checks project read access. */
  forProject(projectId: number, before?: number, limit?: number): Promise<ActivityPage> {
    return this.page(this.repo.createQueryBuilder('a').where('a.projectId = :projectId', { projectId }), before, limit);
  }

  /** What the user did, plus what happened to their personal tasks and to their projects that no longer exist. */
  mine(userId: number, before?: number, limit?: number): Promise<ActivityPage> {
    const qb = this.repo.createQueryBuilder('a');
    // A project that is gone (deleted or in the trash) no longer has its own history to read.
    const projectExists = qb.subQuery().select('1').from(Node, 'n').where('n.id = a.projectId').getQuery();
    qb.where(
      `(a.actorId = :userId OR (a.ownerId = :userId AND (a.projectId IS NULL OR NOT EXISTS ${projectExists})))`,
      {
        userId,
      },
    );
    return this.page(qb, before, limit);
  }

  /** Everything, filtered. For app admins only: no access check by design. */
  admin(filter: AdminActivityFilter, before?: number, limit?: number): Promise<ActivityPage> {
    const qb = this.repo.createQueryBuilder('a').where('1 = 1');
    if (filter.actorId) qb.andWhere('a.actorId = :actorId', { actorId: filter.actorId });
    if (filter.projectId) qb.andWhere('a.projectId = :projectId', { projectId: filter.projectId });
    if (filter.nodeId) qb.andWhere('a.nodeId = :nodeId', { nodeId: filter.nodeId });
    if (filter.action) qb.andWhere('a.action = :action', { action: filter.action });
    if (filter.from) qb.andWhere('a.createdAt >= :from', { from: filter.from });
    if (filter.to) qb.andWhere('a.createdAt <= :to', { to: filter.to });
    return this.page(qb, before, limit ?? 50);
  }
}
