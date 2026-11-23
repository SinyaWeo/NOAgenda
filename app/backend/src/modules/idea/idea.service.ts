import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Node, NodeType } from '../node/node.entity';
import { User } from '../user/user.entity';
import { Access, NodeAccessService } from '../node/node-access.service';
import { NodeService } from '../node/node.service';
import { NodeRevisionService, RevisionPage } from '../node-revision/node-revision.service';
import { trashRetentionDays } from '../node/node-trash.service';
import { MAX_PAGE_SIZE } from '../node/dto/node.dto';
import { IdeaCreateDto, IdeaUpdateDto } from './dto/idea.dto';

export interface IdeaTrashEntry {
  id: number;
  text: string;
  deletedAt: Date;
  /** When it will be deleted for good. */
  purgeAt: Date;
}

export interface IdeaView {
  id: number;
  text: string;
  createdAt: Date;
  isMine: boolean;
  owner: { id: number; username: string; name: string | null } | null;
  /** The project it belongs to; omitted when the viewer cannot read that project. */
  project: { id: number; name: string } | null;
  /** Teams it is shared with (only reported to its creator). */
  sharedTeamIds: number[];
}

interface IdeaRow {
  id: number;
  text: string | null;
  createdAt: Date;
  createdBy: number | null;
  parentId: number | null;
  username: string | null;
  name: string | null;
}

/**
 * Ideas are private notes. Visible to their creator, and read-only to the members of the
 * teams the creator shared them with. Nothing else grants access: not a project role, not
 * the project the idea hangs under (NodeAccessService.level() is NONE for ideas on purpose).
 */
@Injectable()
export class IdeaService {
  constructor(
    @InjectRepository(Node)
    private readonly nodes: Repository<Node>,
    private readonly access: NodeAccessService,
    private readonly nodeService: NodeService,
    private readonly revisions: NodeRevisionService,
  ) {}

  /** Own ideas plus ideas shared with one of the viewer's teams, newest first. */
  async list(userId: number, opts: { id?: number; projectId?: number } = {}): Promise<IdeaView[]> {
    const qb = this.nodes
      .createQueryBuilder('n')
      .leftJoin(User, 'u', 'u.id = n.createdBy')
      .select('n.id', 'id')
      .addSelect('n.description', 'text')
      .addSelect('n.createdAt', 'createdAt')
      .addSelect('n.createdBy', 'createdBy')
      .addSelect('n.parentId', 'parentId')
      .addSelect('u.username', 'username')
      .addSelect('u.name', 'name')
      .where('n.type = :type', { type: NodeType.IDEA })
      .andWhere(
        `(n.createdBy = :userId OR EXISTS (SELECT 1 FROM idea_teams it JOIN team_members tm ON tm.teamId = it.teamId
                                            WHERE it.ideaId = n.id AND tm.userId = :userId))`,
        { userId },
      );
    if (opts.id !== undefined) qb.andWhere('n.id = :id', { id: opts.id });
    if (opts.projectId !== undefined) qb.andWhere('n.parentId = :projectId', { projectId: opts.projectId });
    const rows: IdeaRow[] = await qb
      .orderBy('n.createdAt', 'DESC')
      .addOrderBy('n.id', 'DESC')
      .limit(MAX_PAGE_SIZE)
      .getRawMany();
    if (!rows.length) return [];

    const mineIds = rows.filter((r) => r.createdBy === userId).map((r) => r.id);
    const shared = new Map<number, number[]>();
    if (mineIds.length) {
      const t: { ideaId: number; teamId: number }[] = await this.nodes.manager.query(
        `SELECT ideaId, teamId FROM idea_teams WHERE ideaId IN (${mineIds.map(() => '?').join(',')})`,
        mineIds,
      );
      for (const r of t) shared.set(r.ideaId, [...(shared.get(r.ideaId) ?? []), r.teamId]);
    }

    // A project is only named to viewers who may read it.
    const projects = new Map<number, { id: number; name: string } | null>();
    for (const pid of new Set(rows.map((r) => r.parentId).filter((p): p is number => p != null))) {
      const p =
        (await this.access.level(userId, pid)) >= Access.READ
          ? await this.nodes.findOne({ where: { id: pid, type: NodeType.PROJECT }, select: { id: true, name: true } })
          : null;
      projects.set(pid, p ? { id: p.id, name: p.name ?? '' } : null);
    }

    return rows.map((r) => ({
      id: r.id,
      text: r.text ?? '',
      createdAt: r.createdAt,
      isMine: r.createdBy === userId,
      owner: r.createdBy != null ? { id: r.createdBy, username: r.username ?? '', name: r.name } : null,
      project: r.parentId != null ? (projects.get(r.parentId) ?? null) : null,
      sharedTeamIds: shared.get(r.id) ?? [],
    }));
  }

  async create(userId: number, dto: IdeaCreateDto): Promise<IdeaView> {
    if (dto.projectId != null) await this.access.assertProject(userId, dto.projectId, Access.READ);
    const saved = await this.nodeService.create(
      { type: NodeType.IDEA, description: dto.text, createdBy: userId, parentId: dto.projectId ?? null },
      userId,
    );
    return this.one(userId, saved.id);
  }

  async update(userId: number, id: number, dto: IdeaUpdateDto): Promise<IdeaView> {
    await this.assertOwn(userId, id);
    const change: Partial<Node> = {};
    if (dto.text !== undefined) change.description = dto.text;
    if (dto.projectId !== undefined) {
      if (dto.projectId !== null) await this.access.assertProject(userId, dto.projectId, Access.READ);
      change.parentId = dto.projectId;
    }
    if (Object.keys(change).length) await this.nodeService.update(id, change, userId);
    return this.one(userId, id);
  }

  /** Move the idea to the trash (it is deleted for good after the trash retention period). */
  async remove(userId: number, id: number): Promise<void> {
    await this.assertOwn(userId, id);
    await this.nodeService.remove(id, userId);
  }

  /** The creator's deleted ideas, newest first. */
  async listTrashed(userId: number): Promise<IdeaTrashEntry[]> {
    const rows = await this.nodes
      .createQueryBuilder('n')
      .withDeleted()
      .where('n.type = :type', { type: NodeType.IDEA })
      .andWhere('n.createdBy = :userId', { userId })
      .andWhere('n.deletedAt IS NOT NULL')
      .orderBy('n.deletedAt', 'DESC')
      .addOrderBy('n.id', 'DESC')
      .limit(MAX_PAGE_SIZE)
      .getMany();
    const retention = trashRetentionDays() * 24 * 60 * 60 * 1000;
    return rows.map((n) => ({
      id: n.id,
      text: n.description ?? '',
      deletedAt: n.deletedAt!,
      purgeAt: new Date(n.deletedAt!.getTime() + retention),
    }));
  }

  /** Bring a deleted idea back. If its project is gone meanwhile it comes back without one. */
  async restore(userId: number, id: number): Promise<IdeaView> {
    const idea = await this.ownTrashed(userId, id);
    if (idea.parentId != null && !(await this.nodes.exists({ where: { id: idea.parentId } }))) {
      await this.nodes.update(id, { parentId: null });
    }
    await this.nodeService.restore(id, userId);
    return this.one(userId, id);
  }

  /** Delete a trashed idea for good. */
  async purge(userId: number, id: number): Promise<void> {
    await this.ownTrashed(userId, id);
    await this.nodeService.purge(id);
  }

  /** Saved texts of one of your ideas, newest first. */
  async history(userId: number, id: number, before?: number, limit?: number): Promise<RevisionPage> {
    await this.assertOwn(userId, id);
    return this.revisions.list(id, before, limit);
  }

  /** Put an earlier text back (recorded as a new revision). */
  async restoreRevision(userId: number, id: number, revisionId: number): Promise<IdeaView> {
    await this.assertOwn(userId, id);
    const revision = await this.revisions.findById(revisionId);
    if (!revision || revision.nodeId !== id) throw new NotFoundException();
    await this.nodeService.update(id, { description: revision.description ?? '' }, userId);
    return this.one(userId, id);
  }

  /** Replace the set of teams the idea is shared with. The creator can only pick teams they are a member of. */
  async setTeams(userId: number, id: number, teamIds: number[]): Promise<IdeaView> {
    await this.assertOwn(userId, id);
    const wanted = [...new Set(teamIds)];
    const mine: { teamId: number }[] = await this.nodes.manager.query(
      'SELECT teamId FROM team_members WHERE userId = ?',
      [userId],
    );
    const allowed = new Set(mine.map((m) => m.teamId));
    if (wanted.some((t) => !allowed.has(t))) throw new ForbiddenException();
    await this.nodes.manager.transaction(async (m) => {
      await m.query('DELETE FROM idea_teams WHERE ideaId = ?', [id]);
      for (const teamId of wanted) {
        await m.query('INSERT INTO idea_teams (ideaId, teamId) VALUES (?, ?)', [id, teamId]);
      }
    });
    return this.one(userId, id);
  }

  private async one(userId: number, id: number): Promise<IdeaView> {
    const [idea] = await this.list(userId, { id });
    if (!idea) throw new NotFoundException();
    return idea;
  }

  private async ownTrashed(userId: number, id: number): Promise<Node> {
    const idea = await this.nodeService.findTrashed(Number(id));
    if (!idea || idea.type !== NodeType.IDEA || idea.createdBy !== userId) throw new NotFoundException();
    return idea;
  }

  /** The caller must be the creator. Ideas they cannot see at all are 404, ones shared with them 403. */
  private async assertOwn(userId: number, id: number): Promise<void> {
    const idea = await this.nodes.findOne({
      where: { id: Number(id), type: NodeType.IDEA },
      select: { id: true, createdBy: true },
    });
    if (!idea) throw new NotFoundException();
    if (idea.createdBy === userId) return;
    const [visible] = await this.list(userId, { id: idea.id });
    throw visible ? new ForbiddenException() : new NotFoundException();
  }
}
