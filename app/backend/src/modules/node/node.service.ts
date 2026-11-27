import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Not, Repository } from 'typeorm';
import { diffFields } from '../../common/diff-fields';
import { omit } from '../../common/omit';
import { sqlRunner } from '../../common/sql';
import { existsSync, unlink } from 'fs';
import { resolve } from 'path';
import { Node, NodeType, NodeStatus } from './node.entity';
import { DomainEvents } from '../../common/domain-events';
import {
  deleteNodes,
  doneTaskIdsBelow,
  markTrashed,
  projectIdsOf,
  relativeReminders,
  reopen,
  subtreeIds,
  trashedBefore,
  unmarkTrashed,
  VISIBLE_TO_USER_SQL,
} from './node-sql';
import { isRecurring, recurrenceOnCompletion } from './node-recurrence';
import { daysBeforeAt, safeTimeZone } from '../../common/zoned-time';
import { KanbanBucket } from '../kanban-bucket/kanban-bucket.entity';
import { Translator } from '../../i18n/translator.service';

/** The statuses every project keeps a Kanban bucket for, in board order. */
export const BUCKET_STATUSES = [NodeStatus.OPEN, NodeStatus.IN_PROGRESS, NodeStatus.DONE] as const;
export const UNKNOWN_BUCKET = 'Unknown kanban bucket';
export const BUCKET_STATUS_MISMATCH = 'The status does not match the kanban bucket';

export interface NodeFilter {
  userId?: number;
  type?: NodeType;
  parentId?: number | null;
  status?: NodeStatus;
  search?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  includeArchived?: boolean;
  priority?: number;
  dueBefore?: Date;
  dueAfter?: Date;
  /** With dueBefore: tasks without a due date match too. */
  includeUndated?: boolean;
  excludeDone?: boolean;
  /** Only tasks that repeat. */
  recurringOnly?: boolean;
}

const UPLOADS_DIR = resolve(process.cwd(), 'uploads');
const CHUNK = 500;
const MAX_TREE_DEPTH = 64;
/** Safety ceiling for list endpoints that did not ask for a page size. */
const MAX_LIST = 1000;
const marks = (n: number) => Array(n).fill('?').join(',');

@Injectable()
export class NodeService {
  constructor(
    @InjectRepository(Node)
    private readonly nodeRepository: Repository<Node>,
    private readonly events: DomainEvents,
    private readonly translator: Translator,
  ) {}

  async findAll(filter: NodeFilter = {}): Promise<Node[]> {
    const qb = this.nodeRepository.createQueryBuilder('node');

    if (filter.type) {
      qb.andWhere('node.type = :type', { type: filter.type });
    }

    if (filter.userId !== undefined) {
      // Same rules as NodeAccessService.level(): a node is visible when it sits at or
      // below a project the user owns or was granted (directly or via a team), or
      // below a personal top-level task they created or are assigned to. Any depth; cycle-safe (UNION).
      qb.andWhere(VISIBLE_TO_USER_SQL, { uid: filter.userId });
    }

    if (!filter.includeArchived && (filter.type === NodeType.PROJECT || filter.type === undefined)) {
      qb.andWhere('(node.type != :pt OR node.isArchived = false)', { pt: NodeType.PROJECT });
    }

    if (filter.parentId !== undefined) {
      if (filter.parentId === null) {
        qb.andWhere('node.parentId IS NULL');
      } else {
        qb.andWhere('node.parentId = :parentId', { parentId: filter.parentId });
      }
    }

    if (filter.status) {
      qb.andWhere('node.status = :status', { status: filter.status });
    }
    if (filter.excludeDone) qb.andWhere("(node.status IS NULL OR node.status != 'done')");
    if (filter.recurringOnly) qb.andWhere('node.repeatAfter > 0');
    if (filter.priority !== undefined) qb.andWhere('node.priority = :priority', { priority: filter.priority });
    if (filter.dueBefore) {
      qb.andWhere(
        filter.includeUndated ? '(node.dueDate IS NULL OR node.dueDate <= :dueBefore)' : 'node.dueDate <= :dueBefore',
        { dueBefore: filter.dueBefore },
      );
    }
    if (filter.dueAfter) qb.andWhere('node.dueDate >= :dueAfter', { dueAfter: filter.dueAfter });

    if (filter.search) {
      qb.andWhere('(node.name LIKE :s OR node.title LIKE :s OR node.description LIKE :s)', {
        s: `%${filter.search.replace(/[\\%_]/g, (c) => '\\' + c)}%`,
      });
    }

    const sortField =
      filter.sort === 'title'
        ? 'node.title'
        : filter.sort === 'name'
          ? 'node.name'
          : filter.sort === 'priority'
            ? 'node.priority'
            : filter.sort === 'status'
              ? 'node.status'
              : filter.sort === 'dueDate'
                ? filter.order === 'DESC'
                  ? "COALESCE(node.dueDate, '1000-01-01')"
                  : "COALESCE(node.dueDate, '9999-12-31')"
                : filter.sort === 'createdAt'
                  ? 'node.createdAt'
                  : filter.sort === 'updatedAt'
                    ? 'node.updatedAt'
                    : 'node.position';
    const sortOrder = filter.order === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy(sortField, sortOrder).addOrderBy('node.createdAt', 'DESC');

    // Always bounded: an explicit limit is honoured, otherwise a generous safety ceiling.
    const limit = Math.min(filter.limit ?? MAX_LIST, MAX_LIST);
    const page = filter.limit ? (filter.page ?? 1) : 1;
    qb.skip((page - 1) * limit).take(limit);

    return qb.getMany();
  }

  async findById(id: number): Promise<Node | null> {
    const node = await this.nodeRepository.findOne({ where: { id }, relations: { parent: true, children: true } });
    if (node?.children) node.children = node.children.filter((c) => c.type !== NodeType.IDEA);
    return node;
  }

  /** Ideas hanging under a node are private to their creator, so they are never part of a node's children. */
  async findChildren(parentId: number): Promise<Node[]> {
    return this.nodeRepository.find({
      where: { parentId, type: Not(NodeType.IDEA) },
      order: { position: 'ASC', createdAt: 'DESC' },
    });
  }

  /** Recursively load the full tree for a given root node */
  async findTree(rootId: number): Promise<Node | null> {
    const root = await this.findById(rootId);
    if (!root) return null;
    root.children = await this.loadChildrenRecursive(rootId);
    return root;
  }

  /** Depth- and cycle-safe: each node is visited once, nesting is capped. */
  private async loadChildrenRecursive(
    parentId: number,
    seen = new Set<number>([parentId]),
    depth = 0,
  ): Promise<Node[]> {
    if (depth >= MAX_TREE_DEPTH) return [];
    const children = (await this.findChildren(parentId)).filter((c) => !seen.has(c.id));
    for (const child of children) seen.add(child.id);
    for (const child of children) {
      child.children = await this.loadChildrenRecursive(child.id, seen, depth + 1);
    }
    return children;
  }

  /** Tell subscribers (webhooks) what happened to a node. `projectId` is only needed when the node is about to vanish. */
  private announce(
    action: 'created' | 'updated' | 'deleted' | 'restored',
    node: Node,
    projectId?: number | null,
    audit: { actorId?: number | null; changes?: Record<string, unknown> } = {},
  ) {
    const isProject = node.type === NodeType.PROJECT;
    const isIdea = node.type === NodeType.IDEA;
    // Children and parent are relations, not the node's own fields.
    const data = omit(node, 'parent', 'children');
    this.events.emit({
      name: `${node.type}.${action}`,
      data,
      nodeId: node.id,
      // An idea is private: it never belongs to a project's history and never reaches webhooks.
      ...(isIdea ? { projectId: null, auditOnly: true } : {}),
      ...(isProject ? { projectId: node.id } : !isIdea && projectId !== undefined ? { projectId } : {}),
      owner: isProject ? (node.ownerId ?? null) : (node.createdBy ?? null),
      ...(audit.actorId !== undefined ? { actorId: audit.actorId } : {}),
      ...(audit.changes ? { changes: audit.changes } : {}),
    });
  }

  /** The project a node belongs to (the node itself for a project), or null for a personal task. */
  async projectIdOf(node: Pick<Node, 'id' | 'type' | 'parentId'>): Promise<number | null> {
    let cur: Pick<Node, 'id' | 'type' | 'parentId'> | null = node;
    for (let depth = 0; cur && depth < MAX_TREE_DEPTH; depth++) {
      if (cur.type === NodeType.PROJECT) return cur.id;
      if (cur.parentId == null) return null;
      cur = await this.nodeRepository.findOne({
        where: { id: cur.parentId },
        select: { id: true, type: true, parentId: true },
      });
    }
    return null;
  }

  /** The project of each node in one query (absent: outside any project). */
  async projectIdsOf(ids: number[]): Promise<Map<number, number>> {
    return ids.length ? projectIdsOf(sqlRunner(this.nodeRepository.manager), ids) : new Map();
  }

  async create(data: Partial<Node>, actorId?: number): Promise<Node> {
    const node = this.nodeRepository.create(await this.applyBucketRules(null, data));
    const saved = await this.nodeRepository.save(node);
    if (saved.type === NodeType.PROJECT) await this.seedBuckets(saved.id, actorId ?? saved.ownerId);
    this.announce('created', saved, undefined, { actorId: actorId ?? null });
    return saved;
  }

  /** A new project starts with one Kanban bucket per status, titled in the creator's saved language. */
  private async seedBuckets(projectId: number, userId?: number | null): Promise<void> {
    const m = this.nodeRepository.manager;
    const rows: { language?: string | null }[] = userId
      ? await m.query('SELECT language FROM users WHERE id = ?', [userId])
      : [];
    const lang = rows[0]?.language;
    await m.getRepository(KanbanBucket).insert(
      BUCKET_STATUSES.map((status, position) => ({
        projectId,
        status,
        position,
        title: this.translator.t(lang, `kanban.default.${status}`),
      })),
    );
  }

  /** A duplicated project gets the same columns as its original (instead of the defaults). */
  private async copyBuckets(fromId: number, toId: number): Promise<void> {
    const repo = this.nodeRepository.manager.getRepository(KanbanBucket);
    const source = await repo.find({ where: { projectId: fromId }, order: { position: 'ASC', id: 'ASC' } });
    if (!source.length) return;
    await repo.delete({ projectId: toId });
    await repo.insert(
      source.map(({ title, status, position, limit }) => ({ projectId: toId, title, status, position, limit })),
    );
  }

  /**
   * Kanban rules for a task write. Placing a task in a bucket gives it the bucket's status; the
   * bucket must belong to the task's project. A task that changes parent leaves its bucket unless
   * a new one comes with the change. Projects never have a bucket. A status change without a bucket
   * is reconciled after saving (`releaseMismatchedBuckets`).
   */
  private async applyBucketRules(existing: Node | null, data: Partial<Node>): Promise<Partial<Node>> {
    const type = existing?.type ?? data.type;
    if (data.bucketId === undefined) {
      const parentChanged = existing && data.parentId !== undefined && data.parentId !== existing.parentId;
      return parentChanged && existing.bucketId != null ? { ...data, bucketId: null } : data;
    }
    if (data.bucketId === null) return data;
    if (type !== NodeType.TASK) throw new BadRequestException(UNKNOWN_BUCKET);
    const bucket = await this.nodeRepository.manager
      .getRepository(KanbanBucket)
      .findOne({ where: { id: data.bucketId } });
    const parentId = data.parentId !== undefined ? data.parentId : (existing?.parentId ?? null);
    const projectId = await this.projectIdOf({ id: existing?.id ?? 0, type: NodeType.TASK, parentId });
    if (!bucket || projectId == null || bucket.projectId !== projectId) throw new BadRequestException(UNKNOWN_BUCKET);
    if (data.status != null && data.status !== bucket.status) throw new BadRequestException(BUCKET_STATUS_MISMATCH);
    return { ...data, status: bucket.status };
  }

  /** Tasks whose status no longer matches their bucket's leave it (they show in the first bucket of their status). */
  private async releaseMismatchedBuckets(m: EntityManager, ids: number[]): Promise<void> {
    if (!ids.length) return;
    await m
      .createQueryBuilder()
      .update(Node)
      .set({ bucketId: null })
      .where({ id: In(ids) })
      .andWhere('bucketId IS NOT NULL')
      .andWhere('(status IS NULL OR status <> (SELECT b.status FROM kanban_buckets b WHERE b.id = bucketId))')
      .execute();
  }

  /**
   * Completing a repeating task does not leave it done: it starts its next cycle (open again, no
   * progress, subtasks unticked unless the task opts out, dates and reminders moved on) until its series ends. Every completion
   * of a repeating task is kept in its history. Everything else is a plain update.
   * `actorId` is who saves it: the next date is worked out in their time zone.
   */
  async update(id: number, input: Partial<Node>, actorId?: number): Promise<Node | null> {
    const m = this.nodeRepository.manager;
    const existing = await this.nodeRepository.findOne({ where: { id } });
    // Dropping a task into a bucket sets its status first, so a "done" bucket completes a repeating task too.
    const data = await this.applyBucketRules(existing, input);
    let change = data;
    let shiftMs: number | null = null;
    let completed: Node | null = null;
    let cycled = false;
    if (existing && this.completesRepeatingTask(existing, data)) {
      completed = existing;
      const recurrence = recurrenceOnCompletion(existing, data, new Date(), await this.timeZoneOf(m, actorId));
      if (recurrence) {
        ({ shiftMs, ...change } = recurrence);
        cycled = true;
      }
    }
    await this.nodeRepository.update(id, change);
    if (change.status !== undefined) await this.releaseMismatchedBuckets(m, [id]);
    if (completed) await this.recordCompletion(m, completed, data, actorId);
    if (cycled && existing) {
      await this.rearmReminders(m, [id], shiftMs);
      if (this.resetsSubtasks(existing, data)) await this.reopenSubtasks(m, [id]);
    }
    if (change.dueDate !== undefined) await this.realignRelativeReminders(m, [id]);
    const node = await this.findById(id);
    if (node) {
      const changes = existing ? diffFields(existing, change) : {};
      this.announce('updated', node, undefined, { actorId: actorId ?? null, changes });
    }
    return node;
  }

  /** Is saving `change` over `existing` the completion of a task that repeats (whether or not it goes on)? */
  private completesRepeatingTask(existing: Node, change: Partial<Node>): boolean {
    if (change.status !== NodeStatus.DONE || existing.status === NodeStatus.DONE) return false;
    return isRecurring({
      type: existing.type,
      repeatAfter: change.repeatAfter !== undefined ? change.repeatAfter : existing.repeatAfter,
    });
  }

  /** Does a new cycle of `existing` (saved with `change`) untick its done subtasks? On unless the task opts out. */
  private resetsSubtasks(existing: Node, change: Partial<Node>): boolean {
    const value = change.repeatResetSubtasks !== undefined ? change.repeatResetSubtasks : existing.repeatResetSubtasks;
    return value !== false;
  }

  /** The time zone a user's calendar dates are counted in. */
  async userTimeZone(userId?: number): Promise<string> {
    return this.timeZoneOf(this.nodeRepository.manager, userId);
  }

  private async timeZoneOf(m: EntityManager, userId?: number): Promise<string> {
    if (!userId) return 'UTC';
    const rows = await m.query('SELECT timezone FROM users WHERE id = ?', [userId]);
    return safeTimeZone(rows?.[0]?.timezone);
  }

  /** One row in the task's completion history: when it was ticked off, by whom, and which due date it was for. */
  private async recordCompletion(m: EntityManager, task: Node, change: Partial<Node>, actorId?: number): Promise<void> {
    const due = change.dueDate !== undefined ? change.dueDate : task.dueDate;
    await m.query('INSERT INTO task_completions (nodeId, completedAt, completedBy, dueDate) VALUES (?, ?, ?, ?)', [
      task.id,
      new Date(),
      actorId ?? null,
      due ?? null,
    ]);
  }

  /** A new cycle starts with a clean slate: done subtasks (at any depth) are open again. Callers check `resetsSubtasks`. */
  private async reopenSubtasks(m: EntityManager, parentIds: number[]): Promise<void> {
    const q = sqlRunner(m);
    await reopen(q, await doneTaskIdsBelow(q, parentIds));
  }

  /**
   * A new cycle starts: reminders move on with the due date and fire again, unless the moved time is
   * already past (completing a task very late must not set off a burst of reminders). Without a previous
   * due date there is nothing to move them relative to, so they are left alone.
   */
  private async rearmReminders(m: EntityManager, nodeIds: number[], shiftMs: number | null): Promise<void> {
    if (!nodeIds.length || shiftMs === null) return;
    const seconds = Math.round(shiftMs / 1000);
    const moved = 'DATE_ADD(reminderDate, INTERVAL ? SECOND)';
    // MariaDB applies SET left to right, so sentAt must be assigned before reminderDate changes.
    await m.query(
      `UPDATE task_reminders SET sentAt = CASE WHEN ${moved} > ? THEN NULL ELSE COALESCE(sentAt, ?) END, reminderDate = ${moved}
        WHERE nodeId IN (${marks(nodeIds.length)})`,
      [seconds, new Date(), new Date(), seconds, ...nodeIds],
    );
  }

  /**
   * Reminders set as "N days before the due date at HH:MM" follow the due date: recalculated in their
   * creator's time zone, and armed again when the new time is still ahead (one already past is marked
   * sent, so moving a due date never fires a burst of stale reminders). Without a due date they stay.
   */
  private async realignRelativeReminders(m: EntityManager, nodeIds: number[]): Promise<void> {
    if (!nodeIds.length) return;
    const now = new Date();
    for (const r of await relativeReminders(sqlRunner(m), nodeIds)) {
      if (!r.dueDate) continue;
      const at = daysBeforeAt(new Date(r.dueDate), r.daysBefore, r.atTime, safeTimeZone(r.timezone));
      await m.query(
        `UPDATE task_reminders SET reminderDate = ?, sentAt = CASE WHEN ? > ? THEN NULL ELSE COALESCE(sentAt, ?) END
          WHERE id = ?`,
        [at, at, now, now, r.id],
      );
    }
  }

  /** Apply the same changes to many nodes atomically: all of them or none. */
  async updateMany(ids: number[], input: Partial<Node>, actorId?: number): Promise<Node[]> {
    // Bulk edits never place tasks in a bucket; moving them elsewhere takes them out of theirs.
    const data: Partial<Node> = { ...input };
    delete data.bucketId;
    if (data.parentId !== undefined) data.bucketId = null;
    const existing = await this.nodeRepository.find({ where: { id: In(ids) } });
    await this.nodeRepository.manager.transaction(async (m) => {
      const repo = m.getRepository(Node);
      // Repeating tasks that this completes each start their next cycle (or end their series); the rest get the plain change.
      const repeating =
        data.status === NodeStatus.DONE ? existing.filter((n) => this.completesRepeatingTask(n, data)) : [];
      const timeZone = repeating.length ? await this.timeZoneOf(m, actorId) : 'UTC';
      const cycles = new Map<number, NonNullable<ReturnType<typeof recurrenceOnCompletion>>>();
      for (const node of repeating) {
        const r = recurrenceOnCompletion(node, data, new Date(), timeZone);
        if (r) cycles.set(node.id, r);
      }
      const plain = ids.filter((id) => !cycles.has(id));
      if (plain.length) await repo.update(plain, data);
      for (const [id, r] of cycles) {
        const { shiftMs, ...change } = r;
        await repo.update(id, change);
        await this.rearmReminders(m, [id], shiftMs);
      }
      const resetting = repeating.filter((n) => cycles.has(n.id) && this.resetsSubtasks(n, data)).map((n) => n.id);
      if (resetting.length) await this.reopenSubtasks(m, resetting);
      if (data.status !== undefined) await this.releaseMismatchedBuckets(m, ids);
      if (data.dueDate !== undefined || cycles.size) {
        await this.realignRelativeReminders(m, data.dueDate !== undefined ? ids : [...cycles.keys()]);
      }
      for (const node of repeating) await this.recordCompletion(m, node, data, actorId);
    });
    const nodes = await this.nodeRepository.find({
      where: { id: In(ids) },
      relations: { parent: true, children: true },
    });
    for (const n of nodes) if (n.children) n.children = n.children.filter((c) => c.type !== NodeType.IDEA);
    const before = new Map(existing.map((n) => [n.id, n]));
    nodes.forEach((n) => {
      const old = before.get(n.id);
      this.announce('updated', n, undefined, { actorId: actorId ?? null, changes: old ? diffFields(old, data) : {} });
    });
    return nodes;
  }

  /**
   * Give several nodes new start and due dates in one transaction (a Gantt move plus the dependents it pushes).
   * Reminders set relative to a due date follow it; each change is announced like a normal edit.
   */
  async reschedule(
    changes: { id: number; startDate: Date | null; dueDate: Date | null }[],
    actorId?: number,
  ): Promise<Node[]> {
    const ids = changes.map((c) => c.id);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Each task may appear only once');
    for (const c of changes) {
      if (c.startDate && c.dueDate && c.startDate.getTime() > c.dueDate.getTime()) {
        throw new BadRequestException('A task cannot start after it is due');
      }
    }
    const existing = await this.nodeRepository.find({ where: { id: In(ids) } });
    if (existing.length !== ids.length) throw new NotFoundException();
    const before = new Map(existing.map((n) => [n.id, n]));
    const time = (d: Date | null | undefined) => (d ? new Date(d).getTime() : null);
    await this.nodeRepository.manager.transaction(async (m) => {
      const repo = m.getRepository(Node);
      for (const c of changes) await repo.update(c.id, { startDate: c.startDate, dueDate: c.dueDate } as Partial<Node>);
      const dueMoved = changes.filter((c) => time(before.get(c.id)?.dueDate) !== time(c.dueDate)).map((c) => c.id);
      if (dueMoved.length) await this.realignRelativeReminders(m, dueMoved);
    });
    const nodes = await this.nodeRepository.find({ where: { id: In(ids) } });
    for (const n of nodes) {
      const old = before.get(n.id);
      const c = changes.find((x) => x.id === n.id);
      const changesOf =
        old && c ? diffFields(old, { startDate: c.startDate, dueDate: c.dueDate } as Partial<Node>) : {};
      this.announce('updated', n, undefined, { actorId: actorId ?? null, changes: changesOf });
    }
    return nodes;
  }

  async move(id: number, parentId: number | null, actorId?: number): Promise<Node | null> {
    const before = await this.nodeRepository.findOne({ where: { id }, select: { id: true, parentId: true } });
    await this.nodeRepository.update(id, { parentId, bucketId: null }); // null = top level; a bucket belongs to the old project
    const node = await this.findById(id);
    if (node) {
      const changes = { parentId: { from: before?.parentId ?? null, to: parentId } };
      this.announce('updated', node, undefined, { actorId: actorId ?? null, changes });
    }
    return node;
  }

  /**
   * Move a node and its whole live subtree to the trash (ideas under it are not part of it). Nothing
   * is deleted yet: every row of the subtree gets the same `deletedAt`, so `restore` brings back
   * exactly that set, and `purgeExpired` removes it for good after the retention period.
   * Attachments, comments, webhooks etc. stay in place while the node is in the trash.
   */
  async remove(id: number, actorId?: number): Promise<void> {
    // Remember what is being deleted (and where it lived) for subscribers.
    const doomed = await this.findById(id);
    if (!doomed) return;
    const doomedProjectId = await this.projectIdOf(doomed);
    const at = new Date();
    let descendants = 0;
    await this.nodeRepository.manager.transaction(async (m) => {
      const q = sqlRunner(m);
      const ids = await subtreeIds(q, [id], 'live');
      descendants = ids.length - 1;
      await markTrashed(q, ids, at, actorId ?? null);
    });
    const changes = {
      descendants: { from: descendants, to: 0 },
      parentId: { from: doomed.parentId ?? null, to: null },
    };
    this.announce('deleted', doomed, doomedProjectId, { actorId: actorId ?? null, changes });
  }

  /** A trashed node (any user's), or null when it is missing or not in the trash. */
  async findTrashed(id: number): Promise<Node | null> {
    const node = await this.nodeRepository.findOne({ where: { id }, withDeleted: true });
    return node?.deletedAt ? node : null;
  }

  /**
   * Take a node out of the trash together with what was trashed with it. Its parent must be live
   * again (restore the parent first), or null when it was top level.
   */
  async restore(id: number, actorId?: number): Promise<Node> {
    const node = await this.findTrashed(id);
    if (!node) throw new NotFoundException();
    if (node.parentId != null && !(await this.nodeRepository.exists({ where: { id: node.parentId } }))) {
      throw new ConflictException('Restore the parent first');
    }
    await this.nodeRepository.manager.transaction(async (m) => {
      const q = sqlRunner(m);
      await unmarkTrashed(q, await subtreeIds(q, [id], node.deletedAt!));
    });
    const restored = await this.findById(id);
    if (!restored) throw new NotFoundException();
    this.announce('restored', restored, undefined, { actorId: actorId ?? null });
    return restored;
  }

  /** Delete a trashed node and what was trashed with it for good. */
  async purge(id: number): Promise<void> {
    const node = await this.findTrashed(id);
    if (!node) throw new NotFoundException();
    const ids = await subtreeIds(sqlRunner(this.nodeRepository.manager), [id], node.deletedAt!);
    await this.hardDelete(ids);
  }

  /** Delete everything that has been in the trash for longer than `days`; returns how many nodes. */
  async purgeExpired(days: number, now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const q = sqlRunner(this.nodeRepository.manager);
    let total = 0;
    for (;;) {
      const ids = await trashedBefore(q, cutoff, 1000);
      if (!ids.length) return total;
      await this.hardDelete(ids);
      total += ids.length;
    }
  }

  /**
   * Irreversibly delete the given nodes and everything hanging off them, in one transaction.
   * Rows without a foreign key to nodes are removed explicitly; attachment files are unlinked only
   * after the commit.
   */
  private async hardDelete(ids: number[]): Promise<void> {
    const files: string[] = [];
    await this.nodeRepository.manager.transaction(async (m) => {
      const q = sqlRunner(m);
      for (let i = 0; i < ids.length; i += CHUNK) {
        const part = ids.slice(i, i + CHUNK);
        const inList = marks(part.length);
        (await q<{ path: string }>(`SELECT path FROM attachments WHERE nodeId IN (${inList})`, part)).forEach((a) =>
          files.push(a.path),
        );
        await q(`DELETE FROM webhook WHERE projectId IN (${inList})`, part);
        await q(`DELETE FROM kanban_buckets WHERE projectId IN (${inList})`, part);
        for (const table of ['subscriptions', 'reactions']) {
          await q(`DELETE FROM ${table} WHERE entityType IN ('project','task') AND entityId IN (${inList})`, part);
        }
        await q(`DELETE FROM node_revisions WHERE nodeId IN (${inList})`, part);
        await deleteNodes(q, part);
      }
    });
    for (const f of files) {
      const abs = resolve(f);
      if (abs.startsWith(UPLOADS_DIR + '/') && existsSync(abs)) unlink(abs, () => undefined);
    }
  }

  async archive(id: number, actorId?: number): Promise<Node | null> {
    await this.nodeRepository.update(id, { isArchived: true });
    const node = await this.findById(id);
    if (node) {
      const changes = { isArchived: { from: false, to: true } };
      this.announce('updated', node, undefined, { actorId: actorId ?? null, changes });
    }
    return node;
  }

  async unarchive(id: number, actorId?: number): Promise<Node | null> {
    await this.nodeRepository.update(id, { isArchived: false });
    const node = await this.findById(id);
    if (node) {
      const changes = { isArchived: { from: true, to: false } };
      this.announce('updated', node, undefined, { actorId: actorId ?? null, changes });
    }
    return node;
  }

  async duplicate(id: number, userId: number): Promise<Node | null> {
    const original = await this.findById(id);
    if (!original) return null;
    const data = omit(original, 'id', 'createdAt', 'updatedAt', 'parent', 'children');
    const suffix = original.type === NodeType.PROJECT ? ' (copy)' : ' (copy)';
    const copy = await this.create(
      {
        ...data,
        name: original.name ? `${original.name}${suffix}` : undefined,
        title: original.title ? `${original.title}${suffix}` : undefined,
        ownerId: original.type === NodeType.PROJECT ? userId : original.ownerId,
        createdBy: original.type === NodeType.TASK ? userId : original.createdBy,
      },
      userId,
    );
    if (copy.type === NodeType.PROJECT) await this.copyBuckets(original.id, copy.id);
    return copy;
  }

  async getTaskStats(projectIds: number[]): Promise<Record<number, { total: number; done: number }>> {
    if (!projectIds.length) return {};
    const rows: { parentId: number; total: string; done: string }[] = await this.nodeRepository
      .createQueryBuilder('n')
      .select('n.parentId', 'parentId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN n.status = 'done' THEN 1 ELSE 0 END)`, 'done')
      .where('n.type = :t', { t: NodeType.TASK })
      .andWhere('n.parentId IN (:...ids)', { ids: projectIds })
      .groupBy('n.parentId')
      .getRawMany();

    const result: Record<number, { total: number; done: number }> = {};
    for (const row of rows) {
      result[Number(row.parentId)] = {
        total: Number(row.total),
        done: Number(row.done),
      };
    }
    return result;
  }
}
