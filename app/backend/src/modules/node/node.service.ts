import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { diffFields } from '../../common/diff-fields';
import { omit } from '../../common/omit';
import { sqlRunner } from '../../common/sql';
import { existsSync, unlink } from 'fs';
import { resolve } from 'path';
import { Node, NodeType, NodeStatus } from './node.entity';
import { DomainEvents } from '../../common/domain-events';
import { isRecurring, recurrenceOnCompletion } from './node-recurrence';
import { safeTimeZone } from '../../common/zoned-time';

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
      qb.andWhere(
        `node.id IN (
          WITH RECURSIVE tree (id) AS (
            SELECT p.id FROM nodes p
             WHERE (p.type = 'project' AND (
                      p.ownerId = :uid
                      OR EXISTS (SELECT 1 FROM project_users pu WHERE pu.projectId = p.id AND pu.userId = :uid)
                      OR EXISTS (SELECT 1 FROM project_teams pt JOIN team_members tm ON tm.teamId = pt.teamId
                                  WHERE pt.projectId = p.id AND tm.userId = :uid)))
                OR (p.type = 'task' AND p.parentId IS NULL AND (
                      p.createdBy = :uid
                      OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.nodeId = p.id AND ta.userId = :uid)))
            UNION
            SELECT c.id FROM nodes c JOIN tree t ON c.parentId = t.id
          )
          SELECT id FROM tree
        )`,
        { uid: filter.userId },
      );
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
    return this.nodeRepository.findOne({ where: { id }, relations: { parent: true, children: true } });
  }

  async findChildren(parentId: number): Promise<Node[]> {
    return this.nodeRepository.find({ where: { parentId }, order: { position: 'ASC', createdAt: 'DESC' } });
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
    action: 'created' | 'updated' | 'deleted',
    node: Node,
    projectId?: number | null,
    audit: { actorId?: number | null; changes?: Record<string, unknown> } = {},
  ) {
    const isProject = node.type === NodeType.PROJECT;
    // Children and parent are relations, not the node's own fields.
    const data = omit(node, 'parent', 'children');
    this.events.emit({
      name: `${node.type}.${action}`,
      data,
      nodeId: node.id,
      ...(isProject ? { projectId: node.id } : projectId !== undefined ? { projectId } : {}),
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

  async create(data: Partial<Node>, actorId?: number): Promise<Node> {
    const node = this.nodeRepository.create(data);
    const saved = await this.nodeRepository.save(node);
    this.announce('created', saved, undefined, { actorId: actorId ?? null });
    return saved;
  }

  /**
   * Completing a repeating task does not leave it done: it starts its next cycle (open again, no
   * progress, subtasks unticked, dates and reminders moved on) until its series ends. Every completion
   * of a repeating task is kept in its history. Everything else is a plain update.
   * `actorId` is who saves it: the next date is worked out in their time zone.
   */
  async update(id: number, data: Partial<Node>, actorId?: number): Promise<Node | null> {
    const m = this.nodeRepository.manager;
    let change = data;
    let shiftMs: number | null = null;
    let completed: Node | null = null;
    let cycled = false;
    const existing = await this.nodeRepository.findOne({ where: { id } });
    if (existing && this.completesRepeatingTask(existing, data)) {
      completed = existing;
      const recurrence = recurrenceOnCompletion(existing, data, new Date(), await this.timeZoneOf(m, actorId));
      if (recurrence) {
        ({ shiftMs, ...change } = recurrence);
        cycled = true;
      }
    }
    await this.nodeRepository.update(id, change);
    if (completed) await this.recordCompletion(m, completed, data, actorId);
    if (cycled) {
      await this.rearmReminders(m, [id], shiftMs);
      await this.reopenSubtasks(m, [id]);
    }
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

  /** A new cycle starts with a clean slate: done subtasks (at any depth) are open again. */
  private async reopenSubtasks(m: EntityManager, parentIds: number[]): Promise<void> {
    const rows = await m.query(
      `WITH RECURSIVE tree (id, depth) AS (
         SELECT id, 1 FROM nodes WHERE parentId IN (${marks(parentIds.length)})
         UNION
         SELECT n.id, t.depth + 1 FROM nodes n JOIN tree t ON n.parentId = t.id WHERE t.depth < ${MAX_TREE_DEPTH}
       )
       SELECT n.id FROM nodes n JOIN tree ON tree.id = n.id WHERE n.type = 'task' AND n.status = 'done'`,
      parentIds,
    );
    const ids: number[] = (rows ?? []).map((r: { id: number }) => r.id);
    for (let i = 0; i < ids.length; i += CHUNK) {
      const part = ids.slice(i, i + CHUNK);
      await m.query(`UPDATE nodes SET status = 'open', percentDone = 0 WHERE id IN (${marks(part.length)})`, part);
    }
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

  /** Apply the same changes to many nodes atomically: all of them or none. */
  async updateMany(ids: number[], data: Partial<Node>, actorId?: number): Promise<Node[]> {
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
      if (cycles.size) await this.reopenSubtasks(m, [...cycles.keys()]);
      for (const node of repeating) await this.recordCompletion(m, node, data, actorId);
    });
    const nodes = await this.nodeRepository.find({
      where: { id: In(ids) },
      relations: { parent: true, children: true },
    });
    const before = new Map(existing.map((n) => [n.id, n]));
    nodes.forEach((n) => {
      const old = before.get(n.id);
      this.announce('updated', n, undefined, { actorId: actorId ?? null, changes: old ? diffFields(old, data) : {} });
    });
    return nodes;
  }

  async move(id: number, parentId: number | null, actorId?: number): Promise<Node | null> {
    const before = await this.nodeRepository.findOne({ where: { id }, select: { id: true, parentId: true } });
    await this.nodeRepository.update(id, { parentId }); // null = top level
    const node = await this.findById(id);
    if (node) {
      const changes = { parentId: { from: before?.parentId ?? null, to: parentId } };
      this.announce('updated', node, undefined, { actorId: actorId ?? null, changes });
    }
    return node;
  }

  /**
   * Delete a node together with its whole subtree and everything hanging off it,
   * in one transaction. (parentId is ON DELETE SET NULL, so deleting only the row
   * would leave the children behind as orphaned top-level nodes.)
   * Rows without a foreign key to nodes are removed explicitly; attachment files
   * are unlinked only after the commit.
   */
  async remove(id: number, actorId?: number): Promise<void> {
    // Remember what is being deleted (and where it lived) for subscribers: it is gone afterwards.
    const doomed = await this.findById(id);
    const doomedProjectId = doomed ? await this.projectIdOf(doomed) : null;
    const files: string[] = [];
    let descendants = 0;
    await this.nodeRepository.manager.transaction(async (m) => {
      const q = sqlRunner(m);
      const all = new Set<number>([id]);
      let frontier = [id];
      while (frontier.length) {
        const next: number[] = [];
        for (let i = 0; i < frontier.length; i += CHUNK) {
          const part = frontier.slice(i, i + CHUNK);
          for (const r of await q<{ id: number }>(
            `SELECT id FROM nodes WHERE parentId IN (${marks(part.length)})`,
            part,
          )) {
            if (!all.has(r.id)) {
              all.add(r.id);
              next.push(r.id);
            }
          }
        }
        frontier = next;
      }
      const ids = [...all];
      descendants = ids.length - 1;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const part = ids.slice(i, i + CHUNK);
        const inList = marks(part.length);
        (await q<{ path: string }>(`SELECT path FROM attachments WHERE nodeId IN (${inList})`, part)).forEach((a) =>
          files.push(a.path),
        );
        await q(`DELETE FROM webhook WHERE projectId IN (${inList})`, part);
        await q(`DELETE FROM kanban_buckets WHERE projectId IN (${inList})`, part);
        for (const table of ['favorites', 'subscriptions', 'reactions']) {
          await q(`DELETE FROM ${table} WHERE entityType IN ('project','task') AND entityId IN (${inList})`, part);
        }
        await q(`DELETE FROM nodes WHERE id IN (${inList})`, part);
      }
    });
    if (doomed) {
      const changes = {
        descendants: { from: descendants, to: 0 },
        parentId: { from: doomed.parentId ?? null, to: null },
      };
      this.announce('deleted', doomed, doomedProjectId, { actorId: actorId ?? null, changes });
    }
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
    return this.create(
      {
        ...data,
        name: original.name ? `${original.name}${suffix}` : undefined,
        title: original.title ? `${original.title}${suffix}` : undefined,
        ownerId: original.type === NodeType.PROJECT ? userId : original.ownerId,
        createdBy: original.type === NodeType.TASK ? userId : original.createdBy,
      },
      userId,
    );
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
