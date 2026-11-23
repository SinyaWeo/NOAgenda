import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { asMock } from '../../../common/__tests__/test-utils';
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
  const queries: { sql: string; args: unknown[] }[] = [];
  const query = jest.fn(async (sql: string, args: unknown[] = []) => {
    queries.push({ sql, args });
    if (sql.includes('FROM nodes n')) {
      const uid = args[0] as number;
      const id = sql.includes('n.id = ?') ? (args[2] as number) : undefined;
      return ideas
        .filter((i) => (id === undefined || i.id === id) && (i.createdBy === uid || i.sharedWith.includes(uid)))
        .map((i) => ({
          id: i.id,
          text: 'x',
          createdAt: new Date(),
          createdBy: i.createdBy,
          parentId: i.parentId,
          username: `u${i.createdBy}`,
          name: null,
        }));
    }
    if (sql.includes('FROM team_members')) return (memberTeams[args[0] as number] ?? []).map((teamId) => ({ teamId }));
    return [];
  });
  const repo = {
    findOne: jest.fn(async ({ where }: { where: { id: number; type?: NodeType } }) => {
      const i = ideas.find((x) => x.id === where.id);
      return i && where.type === NodeType.IDEA ? { id: i.id, createdBy: i.createdBy } : null;
    }),
    update: jest.fn(),
    delete: jest.fn(),
    manager: { query, transaction: jest.fn(async (fn: (m: unknown) => Promise<void>) => fn({ query })) },
  };
  const access = { level: jest.fn(async () => level), assertProject: jest.fn() };
  const svc = new IdeaService(asMock(repo), asMock<NodeAccessService>(access));
  return { svc, repo, access, queries };
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
});
