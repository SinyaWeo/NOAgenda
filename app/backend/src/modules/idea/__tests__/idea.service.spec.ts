import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { asMock } from '../../../common/__tests__/test-utils';
import { NodeService } from '../../node/node.service';
import { NodeRevisionService } from '../../node-revision/node-revision.service';
import { Access, NodeAccessService } from '../../node/node-access.service';
import { NodeType } from '../../node/node.entity';
import { IdeaService } from '../idea.service';

const ME = 1;
const OTHER = 2;

interface Idea {
  id: number;
  createdBy: number;
  parentId: number | null;
  /** Users who can see it through a shared team. */
  sharedWith: number[];
}

function build(ideas: Idea[], memberTeams: Record<number, number[]> = {}, level: Access = Access.READ) {
  const query = jest.fn(async (sql: string, args: unknown[] = []) => {
    if (sql.includes('FROM team_members')) return (memberTeams[args[0] as number] ?? []).map((teamId) => ({ teamId }));
    return [];
  });
  /** Stands in for the query builder: it keeps the bound parameters, which carry the visibility rule. */
  const listBuilder = () => {
    const params: Record<string, unknown> = {};
    const qb = {
      leftJoin: () => qb,
      select: () => qb,
      addSelect: () => qb,
      where: (_sql: string, p: Record<string, unknown>) => Object.assign(params, p) && qb,
      andWhere: (_sql: string, p: Record<string, unknown>) => Object.assign(params, p) && qb,
      orderBy: () => qb,
      addOrderBy: () => qb,
      limit: () => qb,
      getRawMany: async () =>
        ideas
          .filter(
            (i) =>
              (params.id === undefined || i.id === params.id) &&
              (i.createdBy === params.userId || i.sharedWith.includes(params.userId as number)),
          )
          .map((i) => ({
            id: i.id,
            text: 'x',
            createdAt: new Date(),
            createdBy: i.createdBy,
            parentId: i.parentId,
            username: `u${i.createdBy}`,
            name: null,
          })),
    };
    return qb;
  };
  const repo = {
    findOne: jest.fn(async ({ where }: { where: { id: number; type?: NodeType } }) => {
      const i = ideas.find((x) => x.id === where.id);
      return i && where.type === NodeType.IDEA
        ? { id: i.id, createdBy: i.createdBy, description: 'x', parentId: i.parentId }
        : null;
    }),
    createQueryBuilder: jest.fn(listBuilder),
    update: jest.fn(),
    delete: jest.fn(),
    manager: { query, transaction: jest.fn(async (fn: (m: unknown) => Promise<void>) => fn({ query })) },
  };
  const access = { level: jest.fn(async () => level), assertProject: jest.fn() };
  const nodeService = {
    create: jest.fn(async (d: { createdBy: number }) => ({ id: 99, ...d })),
    update: jest.fn(),
    remove: jest.fn(),
    restore: jest.fn(),
    purge: jest.fn(),
    findTrashed: jest.fn(async () => null as unknown),
  };
  const revisions = { list: jest.fn(async () => ({ items: [], next: null })), findById: jest.fn() };
  const svc = new IdeaService(
    asMock(repo),
    asMock<NodeAccessService>(access),
    asMock<NodeService>(nodeService),
    asMock<NodeRevisionService>(revisions),
  );
  return { svc, repo, access, nodeService, revisions };
}

describe('IdeaService', () => {
  it('lists only own and team-shared ideas (the visibility rule is in the query arguments)', async () => {
    const { svc } = build([
      { id: 1, createdBy: ME, parentId: null, sharedWith: [] },
      { id: 2, createdBy: OTHER, parentId: null, sharedWith: [ME] },
      { id: 3, createdBy: OTHER, parentId: null, sharedWith: [] },
    ]);
    const list = await svc.list(ME);
    expect(list.map((i) => i.id)).toEqual([1, 2]);
    expect(list.map((i) => i.isMine)).toEqual([true, false]);
  });

  it('only names the project to viewers who can read it', async () => {
    const { svc } = build([{ id: 1, createdBy: ME, parentId: 10, sharedWith: [] }], {}, Access.NONE);
    expect((await svc.list(ME))[0].project).toBeNull();
  });

  it('a shared idea cannot be edited, deleted or re-shared by a team member (403); a stranger gets 404', async () => {
    const { svc } = build([{ id: 2, createdBy: OTHER, parentId: null, sharedWith: [ME] }]);
    await expect(svc.update(ME, 2, { text: 'y' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.remove(ME, 2)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.setTeams(ME, 2, [])).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.remove(3, 2)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('shares only with teams the creator is a member of', async () => {
    const { svc } = build([{ id: 1, createdBy: ME, parentId: null, sharedWith: [] }], { [ME]: [5] });
    await expect(svc.setTeams(ME, 1, [5, 6])).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.setTeams(ME, 1, [5])).resolves.toBeDefined();
  });

  it('attaching to a project requires read access to it', async () => {
    const { svc, access } = build([]);
    access.assertProject.mockRejectedValueOnce(new ForbiddenException());
    await expect(svc.create(ME, { text: 'x', projectId: 10 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create, update and delete go through NodeService (audit, revisions, trash) as the actor', async () => {
    const { svc, nodeService } = build([{ id: 99, createdBy: ME, parentId: null, sharedWith: [] }]);
    await svc.create(ME, { text: 'a' });
    expect(nodeService.create).toHaveBeenCalledWith(expect.objectContaining({ type: NodeType.IDEA }), ME);
    await svc.update(ME, 99, { text: 'b' });
    expect(nodeService.update).toHaveBeenCalledWith(99, { description: 'b' }, ME);
    await svc.remove(ME, 99);
    expect(nodeService.remove).toHaveBeenCalledWith(99, ME);
  });

  it('only the creator can restore, purge or read the history of an idea (404 otherwise)', async () => {
    const { svc, nodeService } = build([{ id: 1, createdBy: OTHER, parentId: null, sharedWith: [ME] }]);
    nodeService.findTrashed.mockResolvedValue({ id: 1, type: NodeType.IDEA, createdBy: OTHER, parentId: null });
    await expect(svc.restore(ME, 1)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.purge(ME, 1)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.history(ME, 1)).rejects.toBeInstanceOf(ForbiddenException);
    expect(nodeService.restore).not.toHaveBeenCalled();
    expect(nodeService.purge).not.toHaveBeenCalled();
  });

  it("restores the creator's own trashed idea", async () => {
    const { svc, nodeService } = build([{ id: 1, createdBy: ME, parentId: null, sharedWith: [] }]);
    nodeService.findTrashed.mockResolvedValue({ id: 1, type: NodeType.IDEA, createdBy: ME, parentId: null });
    await svc.restore(ME, 1);
    expect(nodeService.restore).toHaveBeenCalledWith(1, ME);
  });

  it('a revision of another node cannot be restored onto an idea', async () => {
    const { svc, revisions, nodeService } = build([{ id: 1, createdBy: ME, parentId: null, sharedWith: [] }]);
    revisions.findById.mockResolvedValue({ id: 5, nodeId: 2, description: 'x' });
    await expect(svc.restoreRevision(ME, 1, 5)).rejects.toBeInstanceOf(NotFoundException);
    expect(nodeService.update).not.toHaveBeenCalled();
  });
});
