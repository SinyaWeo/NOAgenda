import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Node, NodeType, NodeStatus } from './node.entity';

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
}

@Injectable()
export class NodeService {
  constructor(
    @InjectRepository(Node)
    private readonly nodeRepository: Repository<Node>,
  ) {}

  /**
   * Build a base query that scopes results to nodes the user can access.
   * Projects: owned by user OR user listed in project_users.
   * Tasks: belong to a project accessible by the user.
   */
  private accessibleProjectIds(userId: number) {
    return this.nodeRepository
      .createQueryBuilder('n')
      .select('n.id')
      .leftJoin('project_users', 'pu', 'pu.projectId = n.id AND pu.userId = :uid', { uid: userId })
      .where('n.type = :t', { t: NodeType.PROJECT })
      .andWhere('(n.ownerId = :uid OR pu.userId = :uid)', { uid: userId });
  }

  async findAll(filter: NodeFilter = {}): Promise<Node[]> {
    const qb = this.nodeRepository.createQueryBuilder('node');

    if (filter.type) {
      qb.andWhere('node.type = :type', { type: filter.type });
    }

    if (filter.userId !== undefined) {
      if (filter.type === NodeType.PROJECT || filter.type === undefined) {
        // Join project_users for project-level access
        qb.leftJoin(
          'project_users',
          'pu',
          'pu.projectId = node.id AND pu.userId = :uid AND node.type = :pt',
          { uid: filter.userId, pt: NodeType.PROJECT },
        );
      }

      if (filter.type === NodeType.PROJECT) {
        qb.andWhere('(node.ownerId = :uid OR pu.userId = :uid)', { uid: filter.userId });
      } else if (filter.type === NodeType.TASK) {
        // Tasks: parent must be an accessible project or sub-task of one
        qb.innerJoin(
          (sub: any) =>
            sub
              .select('proj.id', 'proj_id')
              .from('nodes', 'proj')
              .leftJoin('project_users', 'pu2', 'pu2.projectId = proj.id AND pu2.userId = :uid2')
              .where('proj.type = :pt2')
              .andWhere('(proj.ownerId = :uid2 OR pu2.userId = :uid2)'),
          'accessible',
          'accessible.proj_id = node.parentId',
          { uid2: filter.userId, pt2: NodeType.PROJECT },
        );
      } else {
        // No type filter — return both projects and tasks accessible to user
        qb.andWhere(
          `(
            (node.type = :pt AND (node.ownerId = :uid OR pu.userId = :uid))
            OR
            (node.type = :tt AND node.createdBy = :uid)
          )`,
          { pt: NodeType.PROJECT, tt: NodeType.TASK, uid: filter.userId },
        );
      }
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

    if (filter.search) {
      qb.andWhere('(node.name LIKE :s OR node.title LIKE :s OR node.description LIKE :s)', {
        s: `%${filter.search}%`,
      });
    }

    const sortField = filter.sort === 'title' ? 'node.title'
      : filter.sort === 'name' ? 'node.name'
      : filter.sort === 'priority' ? 'node.priority'
      : filter.sort === 'status' ? 'node.status'
      : filter.sort === 'dueDate' ? 'node.dueDate'
      : 'node.position';
    const sortOrder = filter.order === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy(sortField, sortOrder).addOrderBy('node.createdAt', 'DESC');

    if (filter.limit) {
      const page = filter.page ?? 1;
      qb.skip((page - 1) * filter.limit).take(filter.limit);
    }

    return qb.getMany();
  }

  async findById(id: number): Promise<Node | null> {
    return this.nodeRepository.findOne({ where: { id }, relations: ['parent', 'children'] });
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

  private async loadChildrenRecursive(parentId: number): Promise<Node[]> {
    const children = await this.findChildren(parentId);
    for (const child of children) {
      child.children = await this.loadChildrenRecursive(child.id);
    }
    return children;
  }

  async create(data: Partial<Node>): Promise<Node> {
    const node = this.nodeRepository.create(data);
    return this.nodeRepository.save(node);
  }

  async update(id: number, data: Partial<Node>): Promise<Node | null> {
    await this.nodeRepository.update(id, data);
    return this.findById(id);
  }

  async move(id: number, parentId: number | null): Promise<Node | null> {
    await this.nodeRepository.update(id, { parentId: parentId ?? undefined });
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.nodeRepository.delete(id);
  }

  async archive(id: number): Promise<Node | null> {
    await this.nodeRepository.update(id, { isArchived: true });
    return this.findById(id);
  }

  async unarchive(id: number): Promise<Node | null> {
    await this.nodeRepository.update(id, { isArchived: false });
    return this.findById(id);
  }

  async duplicate(id: number, userId: number): Promise<Node | null> {
    const original = await this.findById(id);
    if (!original) return null;
    const { id: _id, createdAt: _c, updatedAt: _u, parent: _p, children: _ch, ...data } = original as any;
    const suffix = original.type === NodeType.PROJECT ? ' (copy)' : ' (copy)';
    return this.create({
      ...data,
      name: original.name ? `${original.name}${suffix}` : undefined,
      title: original.title ? `${original.title}${suffix}` : undefined,
      ownerId: original.type === NodeType.PROJECT ? userId : original.ownerId,
      createdBy: original.type === NodeType.TASK ? userId : original.createdBy,
    });
  }
}
