import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Node, NodeType } from './node.entity';

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

const MAX_DEPTH = 32;

/** Fields a client may never set directly on a node (identity / ownership / bookkeeping). */
const PROTECTED_NODE_FIELDS = ['id', 'ownerId', 'createdBy', 'parent', 'children', 'createdAt', 'updatedAt'] as const;

/**
 * Single source of truth for "who may do what to a node (project or task)".
 *
 * - A project: owner => ADMIN; otherwise the best permission granted through
 *   `project_users` or through a team (`project_teams` + `team_members`).
 * - A task inside a project: exactly the access the user has on that project
 *   (being the task's creator adds nothing, so removing someone from a project
 *   also removes their access to what they created there).
 * - A personal task (no project above it): its creator => ADMIN.
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
  async level(userId: number, nodeId: number): Promise<Access> {
    const start = await this.nodeRepository.findOne({ where: { id: nodeId } });
    if (!start) return Access.NONE;

    // Climb to the closest project; its grants decide. Creator-ADMIN applies only
    // to personal tasks whose chain verifiably ends at a root without a project.
    let cur: Node | null = start;
    for (let depth = 0; cur && depth < MAX_DEPTH; depth++) {
      if (cur.type === NodeType.PROJECT) return this.projectLevel(userId, cur);
      if (cur.parentId == null) {
        const personal = start.type === NodeType.TASK && start.createdBy != null && start.createdBy === userId;
        return personal ? Access.ADMIN : Access.NONE;
      }
      cur = await this.nodeRepository.findOne({ where: { id: cur.parentId } });
    }
    return Access.NONE; // broken or over-deep chain: fail closed
  }

  private async projectLevel(userId: number, project: Node): Promise<Access> {
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
