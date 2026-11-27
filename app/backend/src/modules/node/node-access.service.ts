import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Node, NodeType } from './node.entity';
import { Permission } from '../project-user/project-user.entity';
import { sqlRunner } from '../../common/sql';
import { projectAncestors, projectIdsOf } from './node-sql';

/** Access levels, ordered. */
export enum Access {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  ADMIN = 3,
}

const PERMISSION_LEVEL: Record<string, Access> = {
  read: Access.READ,
  write: Access.WRITE,
  admin: Access.ADMIN,
};

/** The permission name for an access level; undefined for NONE. */
export function permissionName(level: Access): Permission | undefined {
  if (level === Access.ADMIN) return Permission.ADMIN;
  if (level === Access.WRITE) return Permission.WRITE;
  return level === Access.READ ? Permission.READ : undefined;
}

/** The fields of a project that its access check needs. */
type ProjectRef = { id: number; ownerId?: number | null };

const MAX_DEPTH = 32;

/** Fields a client may never set directly on a node (identity / ownership / bookkeeping). */
const PROTECTED_NODE_FIELDS = [
  'id',
  'ownerId',
  'createdBy',
  'parent',
  'children',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'deletedBy',
] as const;

/**
 * Single source of truth for "who may do what to a node (project or task)".
 *
 * - A project: owner => ADMIN; otherwise the best permission granted through
 *   `project_users` or through a team (`project_teams` + `team_members`). A subproject inherits:
 *   what the user has on any project above it counts too (owning a parent => ADMIN), so sharing
 *   a project shares its subprojects, and a subproject can add grants but never take them away.
 * - A task inside a project: exactly the access the user has on that project
 *   (being the task's creator adds nothing, so removing someone from a project
 *   also removes their access to what they created there).
 * - A personal task (no project above it): its creator => ADMIN; a user assigned to
 *   its top-level task (`task_assignees`) => WRITE.
 * - An idea: always NONE here (see IdeaService); a parent project never grants access to it.
 * - Anything else (including nodes with no owner / creator and no grant): NONE.
 *   Missing ownership information never grants access.
 */
@Injectable()
export class NodeAccessService {
  constructor(
    @InjectRepository(Node)
    private readonly nodeRepository: Repository<Node>,
  ) {}

  /** Highest access `userId` has on the node, or NONE (also when the node does not exist). */
  async level(userId: number, nodeId: number, withDeleted = false): Promise<Access> {
    const start = await this.nodeRepository.findOne({ where: { id: nodeId }, withDeleted });
    if (!start) return Access.NONE;
    // Ideas are private to their creator (and teams they are shared with) and are checked only in IdeaService:
    // here they never grant access, not even through the project they hang under.
    if (start.type === NodeType.IDEA) return Access.NONE;

    // Climb to the closest project; its grants decide. Creator-ADMIN applies only
    // to personal tasks whose chain verifiably ends at a root without a project.
    let cur: Node | null = start;
    for (let depth = 0; cur && depth < MAX_DEPTH; depth++) {
      if (cur.type === NodeType.PROJECT) return (await this.projectLevels(userId, [cur.id])).get(cur.id) ?? Access.NONE;
      if (cur.parentId == null) {
        if (start.type !== NodeType.TASK) return Access.NONE;
        if (start.createdBy != null && start.createdBy === userId) return Access.ADMIN;
        // A personal task's assignee may work on it (and its subtasks): WRITE, never ADMIN.
        return cur.type === NodeType.TASK && (await this.isAssignee(userId, cur.id)) ? Access.WRITE : Access.NONE;
      }
      cur = await this.nodeRepository.findOne({ where: { id: cur.parentId }, withDeleted });
    }
    return Access.NONE; // broken or over-deep chain: fail closed
  }

  /**
   * `level()` for many nodes at once: nodes are grouped by their project, and each project is checked once.
   * Personal tasks (no project above them) still go through `level()`. Unknown ids and ideas are NONE.
   */
  async levels(userId: number, ids: number[]): Promise<Map<number, Access>> {
    const unique = [...new Set(ids)];
    const out = new Map<number, Access>(unique.map((id) => [id, Access.NONE]));
    if (!unique.length) return out;
    const nodes = await this.nodeRepository.find({ where: { id: In(unique) }, select: { id: true, type: true } });
    const live = nodes.filter((n) => n.type !== NodeType.IDEA);
    const projectOf = await projectIdsOf(
      sqlRunner(this.nodeRepository.manager),
      live.map((n) => n.id),
    );
    const projectIds = [...new Set(projectOf.values())];
    const byProject = await this.projectLevels(userId, projectIds);
    for (const n of live) {
      const pid = projectOf.get(n.id);
      out.set(n.id, pid != null ? (byProject.get(pid) ?? Access.NONE) : await this.level(userId, n.id));
    }
    return out;
  }

  private async isAssignee(userId: number, taskId: number): Promise<boolean> {
    const rows: unknown[] = await this.nodeRepository.manager.query(
      'SELECT 1 FROM task_assignees WHERE nodeId = ? AND userId = ? LIMIT 1',
      [taskId, userId],
    );
    return rows.length > 0;
  }

  /**
   * The caller's access to each of the given projects, as a permission name (`read | write | admin`),
   * so clients can tell which projects they may change before trying. Same rules as `level()`.
   */
  async projectPermissions(userId: number, projects: ProjectRef[]): Promise<Map<number, Permission>> {
    const out = new Map<number, Permission>();
    const levels = await this.projectLevels(
      userId,
      projects.map((p) => p.id),
    );
    for (const [id, level] of levels) {
      const name = permissionName(level);
      if (name) out.set(id, name);
    }
    return out;
  }

  /**
   * The user's level on each project: the best of what they own or were granted (directly or through a
   * team) on the project itself or on any project above it. Two queries, whatever the number of projects.
   */
  private async projectLevels(userId: number, projectIds: number[]): Promise<Map<number, Access>> {
    const out = new Map<number, Access>(projectIds.map((id) => [id, Access.NONE]));
    if (!projectIds.length) return out;
    const q = sqlRunner(this.nodeRepository.manager);
    const chain = await projectAncestors(q, [...new Set(projectIds)]);
    const related = [...new Set(chain.map((r) => r.id))];
    const granted = new Map<number, Access>();
    if (related.length) {
      const rows = await q<{ projectId: number; permission: string }>(
        `SELECT g.projectId, g.permission FROM (
           SELECT projectId, userId, permission FROM project_users
           UNION ALL
           SELECT pt.projectId, tm.userId, pt.permission FROM project_teams pt JOIN team_members tm ON tm.teamId = pt.teamId
         ) g
         WHERE g.userId = ? AND g.projectId IN (${related.map(() => '?').join(',')})`,
        [userId, ...related],
      );
      for (const r of rows) {
        const level = PERMISSION_LEVEL[r.permission] ?? Access.NONE;
        granted.set(Number(r.projectId), Math.max(granted.get(Number(r.projectId)) ?? Access.NONE, level) as Access);
      }
    }
    for (const r of chain) {
      const level = r.ownerId != null && r.ownerId === userId ? Access.ADMIN : (granted.get(r.id) ?? Access.NONE);
      out.set(r.start, Math.max(out.get(r.start) ?? Access.NONE, level) as Access);
    }
    return out;
  }

  /** Access to a node in the trash: what the user had before it was deleted (it is still hidden from `assert`). */
  async assertTrashed(userId: number, node: Node): Promise<void> {
    const needed = node.type === NodeType.PROJECT ? Access.ADMIN : Access.WRITE;
    const level = await this.level(userId, node.id, true);
    if (level === Access.NONE) throw new NotFoundException();
    if (level < needed) throw new ForbiddenException();
  }

  async assert(userId: number, nodeId: number, needed: Access): Promise<void> {
    const node = await this.nodeRepository.findOne({ where: { id: nodeId }, select: { id: true } });
    if (!node) throw new NotFoundException();
    if ((await this.level(userId, nodeId)) < needed) throw new ForbiddenException();
  }

  /** Like assert(), but the node must be a *project* (404 for tasks / unknown ids). */
  async assertProject(userId: number, projectId: number, needed: Access): Promise<void> {
    const node = await this.nodeRepository.findOne({
      where: { id: Number(projectId) },
      select: { id: true, type: true },
    });
    if (!node || node.type !== NodeType.PROJECT) throw new NotFoundException();
    if ((await this.level(userId, node.id)) < needed) throw new ForbiddenException();
  }

  assertRead(userId: number, nodeId: number) {
    return this.assert(userId, nodeId, Access.READ);
  }
  assertWrite(userId: number, nodeId: number) {
    return this.assert(userId, nodeId, Access.WRITE);
  }
  assertAdmin(userId: number, nodeId: number) {
    return this.assert(userId, nodeId, Access.ADMIN);
  }

  /**
   * Needed access to modify/archive a node: ADMIN for a project (owner, ancestor owner or a
   * Manager grant), WRITE for a task. Deleting and moving a project need more: `assertCanRemove`,
   * `assertCanReparent`.
   */
  async assertCanModify(userId: number, node: Node): Promise<void> {
    await this.assert(userId, node.id, node.type === NodeType.PROJECT ? Access.ADMIN : Access.WRITE);
  }

  /**
   * Whether the user owns the project or any project above it. Owner-only actions on a project
   * (delete, purge, move) need this: a "Manager" (`admin`) grant may edit, archive and share a
   * project, but not destroy it or take it into another tree. Sees trashed rows too.
   */
  async ownsProjectTree(userId: number, projectId: number): Promise<boolean> {
    const chain = await projectAncestors(sqlRunner(this.nodeRepository.manager), [projectId]);
    return chain.some((r) => r.ownerId != null && r.ownerId === userId);
  }

  /**
   * Needed access to delete a node (or purge it from the trash): for a project, owning it or a
   * project above it; for a task, the same as `assertCanModify` (call that, or `assertTrashed`, first).
   */
  async assertCanRemove(userId: number, node: Pick<Node, 'id' | 'type'>): Promise<void> {
    if (node.type === NodeType.PROJECT && !(await this.ownsProjectTree(userId, node.id)))
      throw new ForbiddenException();
  }

  /**
   * Check the caller may place a node under `parentId` (create / move / re-parent).
   * `null`/`undefined` parent is allowed (top level, owned by the caller).
   */
  async assertCanUseAsParent(
    userId: number,
    parentId: number | null | undefined,
    movingNodeId?: number,
  ): Promise<void> {
    if (parentId === null || parentId === undefined) return;
    await this.assertWrite(userId, Number(parentId));
    if (movingNodeId !== undefined) await this.assertNoCycle(Number(movingNodeId), Number(parentId));
  }

  /**
   * Check the caller may move existing node(s) under `parentId` (null = top level). Besides
   * `assertCanUseAsParent` (write on the target, no cycle): taking a personal task out of
   * personal space (into a project) needs ADMIN on it, i.e. only its creator may, since the
   * move replaces creator/assignee access with the project's grants. Moves within or between
   * projects keep needing only WRITE (checked by the caller via `assertCanModify`/`assertWrite`).
   * Moving a project needs ownership of it or of a project above it (`ownsProjectTree`): its new
   * parent's owner gains ADMIN over it, so a Manager grant must not be able to carry it off.
   */
  async assertCanReparent(userId: number, nodeIds: number[], parentId: number | null): Promise<void> {
    if (parentId !== null) await this.assertWrite(userId, Number(parentId));
    const moving = await this.nodeRepository.find({ where: { id: In(nodeIds) }, select: { id: true, type: true } });
    const projects = moving.filter((n) => n.type === NodeType.PROJECT);
    if (projects.length) await this.assertProjectParent(parentId);
    for (const p of projects) if (!(await this.ownsProjectTree(userId, p.id))) throw new ForbiddenException();
    for (const id of nodeIds) if (parentId !== null) await this.assertNoCycle(id, Number(parentId));
    const projectOf = await projectIdsOf(
      sqlRunner(this.nodeRepository.manager),
      parentId === null ? nodeIds : [...nodeIds, Number(parentId)],
    );
    const target = parentId === null ? undefined : projectOf.get(Number(parentId));
    for (const id of nodeIds) {
      const current = projectOf.get(id);
      if (current === undefined && current !== target) await this.assert(userId, id, Access.ADMIN);
    }
  }

  /** A project goes at the top level or under another project, never under a task (400 otherwise). */
  async assertProjectParent(parentId: number | null | undefined): Promise<void> {
    if (parentId === null || parentId === undefined) return;
    const parent = await this.nodeRepository.findOne({
      where: { id: Number(parentId) },
      select: { id: true, type: true },
    });
    if (parent?.type !== NodeType.PROJECT)
      throw new BadRequestException('A project can only be placed under a project');
  }

  /**
   * Reject a re-parenting that would make a node its own ancestor (or that sits
   * deeper than access checks can follow). Walks up from the new parent.
   */
  async assertNoCycle(nodeId: number, newParentId: number): Promise<void> {
    if (newParentId === nodeId) throw new BadRequestException('A node cannot be its own parent');
    const seen = new Set<number>();
    let cur: number | null = newParentId;
    for (let depth = 0; cur != null; depth++) {
      if (cur === nodeId) throw new BadRequestException('A node cannot be moved under its own descendant');
      if (seen.has(cur) || depth >= MAX_DEPTH - 1) throw new BadRequestException('Invalid or too deeply nested parent');
      seen.add(cur);
      const n: Pick<Node, 'id' | 'parentId'> | null = await this.nodeRepository.findOne({
        where: { id: cur },
        select: { id: true, parentId: true },
      });
      cur = n?.parentId ?? null;
    }
  }

  /** Remove identity/ownership fields a client must not control. */
  sanitize<T extends object>(data: T): Partial<T> {
    const copy: Record<string, unknown> = { ...(data as Record<string, unknown>) };
    for (const f of PROTECTED_NODE_FIELDS) delete copy[f];
    return copy as Partial<T>;
  }
}
