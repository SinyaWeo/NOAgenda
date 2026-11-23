import { Injectable, Logger } from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { DomainEvent, DomainEvents } from '../../common/domain-events';
import { NodeRevision } from './node-revision.entity';

/** Most revisions kept per node; the oldest go first. */
export const MAX_REVISIONS = 50;
const PAGE = 20;
const MAX_TITLE = 255;

export interface RevisionEntry {
  id: number;
  createdAt: Date;
  nodeId: number;
  title: string | null;
  description: string | null;
  actor: { id: number | null; username: string | null };
}

export interface RevisionPage {
  items: RevisionEntry[];
  /** Pass as `before` to get the next (older) page; null at the end. */
  next: number | null;
}

/**
 * Keeps the full title and description of a task or project each time one of them is created or
 * changed (the audit log only shows shortened text). Listens to domain events, so the node layer
 * does not depend on it.
 */
@Injectable()
export class NodeRevisionService implements OnModuleInit {
  private readonly logger = new Logger(NodeRevisionService.name);

  constructor(
    @InjectRepository(NodeRevision) private readonly repo: Repository<NodeRevision>,
    private readonly events: DomainEvents,
  ) {}

  onModuleInit() {
    this.events.on(async (e) => {
      try {
        await this.handle(e);
      } catch (err) {
        this.logger.warn(`Could not record revision: ${(err as Error).message}`);
      }
    });
  }

  async handle(e: DomainEvent): Promise<void> {
    const [kind, action] = e.name.split('.');
    if (kind !== 'task' && kind !== 'project') return;
    const touched =
      action === 'created' ||
      (action === 'updated' && !!e.changes && ('title' in e.changes || 'description' in e.changes));
    if (!touched) return;
    await this.record(e);
  }

  private async record(e: DomainEvent): Promise<NodeRevision> {
    const data = e.data ?? {};
    const title = typeof data.title === 'string' ? data.title.slice(0, MAX_TITLE) : null;
    const description = typeof data.description === 'string' ? data.description : null;
    const row = await this.repo.save(
      this.repo.create({
        nodeId: e.nodeId,
        actorId: e.actorId ?? null,
        actorName: await this.usernameOf(e.actorId),
        title,
        description,
      }),
    );
    await this.trim(e.nodeId);
    return row;
  }

  /** Drop everything beyond the newest MAX_REVISIONS of a node. */
  private async trim(nodeId: number): Promise<void> {
    const keep = await this.repo.find({
      where: { nodeId },
      order: { id: 'DESC' },
      take: MAX_REVISIONS,
      select: { id: true },
    });
    if (keep.length < MAX_REVISIONS) return;
    await this.repo.delete({ nodeId, id: LessThan(keep[keep.length - 1].id) });
  }

  private async usernameOf(userId?: number | null): Promise<string | null> {
    if (!userId) return null;
    const rows: { username: string }[] = await this.repo.manager.query('SELECT username FROM users WHERE id = ?', [
      userId,
    ]);
    return rows?.[0]?.username ?? null;
  }

  private toEntry(r: NodeRevision): RevisionEntry {
    return {
      id: r.id,
      createdAt: r.createdAt,
      nodeId: r.nodeId,
      title: r.title,
      description: r.description,
      actor: { id: r.actorId, username: r.actorName },
    };
  }

  /** Newest first. The caller must already have checked read access to the node. */
  async list(nodeId: number, before?: number, limit = PAGE): Promise<RevisionPage> {
    const qb = this.repo.createQueryBuilder('r').where('r.nodeId = :nodeId', { nodeId });
    if (before) qb.andWhere('r.id < :before', { before });
    const rows = await qb
      .orderBy('r.id', 'DESC')
      .take(limit + 1)
      .getMany();
    const items = rows.slice(0, limit).map((r) => this.toEntry(r));
    return { items, next: rows.length > limit ? items[items.length - 1].id : null };
  }

  findById(id: number): Promise<NodeRevision | null> {
    return this.repo.findOne({ where: { id } });
  }
}
