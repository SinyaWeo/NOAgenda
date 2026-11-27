import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Node, NodeType } from './node.entity';
import { Permission } from '../project-user/project-user.entity';
import { sqlRunner } from '../../common/sql';
import { projectIdsOf } from './node-sql';

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
 *   `project_users` or through a team (`project_teams` + `team_members`).
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
      if (cur.type === NodeType.PROJECT) return this.projectLevel(userId, cur);
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
    const projects = projectIds.length
      ? await this.nodeRepository.find({ where: { id: In(projectIds) }, select: { id: true, ownerId: true } })
      : [];
    const byProject = new Map<number, Access>();
    for (const p of projects) byProject.set(p.id, await this.projectLevel(userId, p));
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
    await Promise.all(
      projects.map(async (p) => {
        const name = permissionName(await this.projectLevel(userId, p));
        if (name) out.set(p.id, name);
      }),
    );
    return out;
  }

  private async projectLevel(userId: number, project: ProjectRef): Promise<Access> {
    if (project.ownerId != null && project.ownerId === userId) return Access.ADMIN;

    const rows: { permission: string }[] = await this.nodeRepository.manager.query(
      `SELECT permission FROM project_users WHERE projectId = ? AND userId = ?
       UNION ALL
       SELECT pt.permission FROM project_teams pt
         JOIN team_members tm ON tm.teamId = pt.teamId
        WHERE pt.projectId = ? AND tm.userId = ?`,
      [project.id, userId, project.id, userId],
    );
    let best = Access.NONE;
    for (const r of rows) best = Math.max(best, PERMISSION_LEVEL[r.permission] ?? Access.NONE) as Access;
    return best;
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
   * Needed access to modify/delete/archive a node: ADMIN for a project (owner),
   * WRITE for a task.
   */
  async assertCanModify(userId: number, node: Node): Promise<void> {
    await this.assert(userId, node.id, node.type === NodeType.PROJECT ? Access.ADMIN : Access.WRITE);
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
