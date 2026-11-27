import { asMock } from '../../../common/__tests__/test-utils';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Access, NodeAccessService } from '../node-access.service';
import { NodeType } from '../node.entity';

type N = { id: number; type: NodeType; ownerId?: number | null; createdBy?: number | null; parentId?: number | null };

function build(nodes: N[], grants: Record<number, string[]> = {}, assigned: [number, number][] = []) {
  const repo = {
    findOne: jest.fn(async ({ where }: { where: { id: number } }) => nodes.find((n) => n.id === where.id) ?? null),
    // levels(): find({ where: { id: In([...]) } })
    find: jest.fn(async ({ where }: { where: { id: { value: number[] } } }) =>
      nodes.filter((n) => where.id.value.includes(n.id)),
    ),
    manager: {
      // args: [projectId, userId, projectId, userId]
      query: jest.fn(async (sql: string, args: number[]) =>
        sql.includes('WITH RECURSIVE')
          ? // projectIdsOf: the closest project above each start node
            args.flatMap((start) => {
              let cur = nodes.find((n) => n.id === start);
              while (cur && cur.type !== NodeType.PROJECT) cur = nodes.find((n) => n.id === cur?.parentId);
              return cur ? [{ start, projectId: cur.id }] : [];
            })
          : sql.includes('task_assignees')
            ? assigned.filter(([t, u]) => t === args[0] && u === args[1]).map(() => ({ 1: 1 }))
            : (grants[args[0] * 1000 + args[1]] ?? []).map((permission) => ({ permission })),
      ),
    },
  };
  return new NodeAccessService(asMock(repo));
}

const ME = 1;
const OTHER = 2;
const project = (id: number, ownerId: number | null): N => ({ id, type: NodeType.PROJECT, ownerId });
const task = (id: number, parentId: number | null, createdBy: number | null): N => ({
  id,
  type: NodeType.TASK,
  parentId,
  createdBy,
});

describe('NodeAccessService', () => {
  it("projectPermissions names the caller's level per project and leaves out projects without access", async () => {
    const projects = [project(10, ME), project(20, OTHER), project(30, OTHER), project(40, OTHER)];
    const svc = build(projects, { [20 * 1000 + ME]: ['read'], [30 * 1000 + ME]: ['read', 'write'] });
    const perms = await svc.projectPermissions(ME, projects);
    expect(Object.fromEntries(perms)).toEqual({ 10: 'admin', 20: 'read', 30: 'write' });
  });

  it('levels() agrees with level() for every node, checking each project only once', async () => {
    const nodes = [
      project(10, ME),
      task(11, 10, OTHER),
      task(12, 11, OTHER),
      project(20, OTHER),
      task(21, 20, OTHER),
      project(30, OTHER),
      task(31, 30, OTHER),
      task(40, null, ME),
      task(41, null, OTHER),
      task(42, null, OTHER),
      { id: 50, type: NodeType.IDEA, parentId: 10, createdBy: ME },
    ];
    const svc = build(nodes, { [20 * 1000 + ME]: ['read'], [30 * 1000 + ME]: ['write'] }, [[42, ME]]);
    const ids = [...nodes.map((n) => n.id), 999];
    const many = await svc.levels(ME, ids);
    for (const id of ids) expect([id, many.get(id)]).toEqual([id, await svc.level(ME, id)]);
    expect(Object.fromEntries(many)).toMatchObject({ 10: 3, 12: 3, 21: 1, 31: 2, 40: 3, 41: 0, 42: 2, 50: 0, 999: 0 });
  });

  it('levels() of nothing is empty', async () => {
    expect((await build([]).levels(ME, [])).size).toBe(0);
  });

  it('an idea never grants access through level(), not even to its creator or a project member', async () => {
    const idea: N = { id: 13, type: NodeType.IDEA, parentId: 10, createdBy: ME };
    const svc = build([project(10, OTHER), idea], { [10 * 1000 + ME]: ['admin'] });
    expect(await svc.level(ME, 13)).toBe(Access.NONE);
    expect(await svc.level(OTHER, 13)).toBe(Access.NONE);
  });

  it('an assignee of a personal task gets WRITE (not ADMIN), also on its subtasks; others NONE', async () => {
    const svc = build([task(11, null, OTHER), task(12, 11, OTHER)], {}, [[11, ME]]);
    expect(await svc.level(ME, 11)).toBe(Access.WRITE);
    expect(await svc.level(ME, 12)).toBe(Access.WRITE);
    expect(await svc.level(3, 11)).toBe(Access.NONE);
  });

  it('owner has ADMIN on project and on its tasks/subtasks', async () => {
    const svc = build([project(10, ME), task(11, 10, OTHER), task(12, 11, OTHER)]);
    expect(await svc.level(ME, 10)).toBe(Access.ADMIN);
    expect(await svc.level(ME, 11)).toBe(Access.ADMIN);
    expect(await svc.level(ME, 12)).toBe(Access.ADMIN);
  });

  it("a stranger has NONE on someone else's project, tasks and subtasks", async () => {
    const svc = build([project(10, OTHER), task(11, 10, OTHER), task(12, 11, OTHER)]);
    for (const id of [10, 11, 12]) expect(await svc.level(ME, id)).toBe(Access.NONE);
    await expect(svc.assertRead(ME, 11)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('missing owner/creator never grants access (fail closed)', async () => {
    const svc = build([project(10, null), task(11, 10, null), task(12, null, null)]);
    expect(await svc.level(ME, 10)).toBe(Access.NONE);
    expect(await svc.level(ME, 11)).toBe(Access.NONE);
    expect(await svc.level(ME, 12)).toBe(Access.NONE);
  });

  it('project member permission is honoured: read cannot write', async () => {
    const svc = build([project(10, OTHER), task(11, 10, OTHER)], { [10 * 1000 + ME]: ['read'] });
    await expect(svc.assertRead(ME, 11)).resolves.toBeUndefined();
    await expect(svc.assertWrite(ME, 11)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('write member can write tasks but is not admin of the project', async () => {
    const svc = build([project(10, OTHER), task(11, 10, OTHER)], { [10 * 1000 + ME]: ['write'] });
    await expect(svc.assertWrite(ME, 11)).resolves.toBeUndefined();
    await expect(svc.assertAdmin(ME, 10)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("a task creator gets no extra access inside someone else's project", async () => {
    const svc = build([project(10, OTHER), task(11, 10, ME)]);
    expect(await svc.level(ME, 11)).toBe(Access.NONE);
    expect(await svc.level(ME, 10)).toBe(Access.NONE);
  });

  it('a creator downgraded to read cannot write what they created', async () => {
    const svc = build([project(10, OTHER), task(11, 10, ME)], { [10 * 1000 + ME]: ['read'] });
    expect(await svc.level(ME, 11)).toBe(Access.READ);
  });

  it('the creator of a personal task (no project above it) is ADMIN', async () => {
    const svc = build([task(11, null, ME), task(12, 11, ME)]);
    expect(await svc.level(ME, 11)).toBe(Access.ADMIN);
    expect(await svc.level(ME, 12)).toBe(Access.ADMIN);
    expect(await svc.level(OTHER, 11)).toBe(Access.NONE);
  });

  it('rejects re-parenting a node under itself or its descendant', async () => {
    const svc = build([project(10, ME), task(11, 10, ME), task(12, 11, ME)]);
    await expect(svc.assertCanUseAsParent(ME, 11, 11)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.assertCanUseAsParent(ME, 12, 11)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.assertCanUseAsParent(ME, 10, 12)).resolves.toBeUndefined();
  });

  describe('assertCanReparent', () => {
    // 10: my project; 20: OTHER's project where I may write; 11: my personal task; 12: OTHER's personal task assigned to me
    const nodes = [project(10, ME), project(20, OTHER), task(11, null, ME), task(12, null, OTHER), task(21, 20, OTHER)];
    const grants = { [20 * 1000 + ME]: ['write'] };
    const assigned: [number, number][] = [[12, ME]];

    it('lets the creator move a personal task into a writable project and back', async () => {
      const svc = build(nodes, grants, assigned);
      await expect(svc.assertCanReparent(ME, [11], 20)).resolves.toBeUndefined();
      await expect(svc.assertCanReparent(ME, [11], null)).resolves.toBeUndefined();
    });

    it("refuses an assignee moving someone else's personal task into a project", async () => {
      const svc = build(nodes, grants, assigned);
      await expect(svc.assertCanReparent(ME, [12], 10)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows moving a project task between projects with write on the target', async () => {
      const svc = build(nodes, grants, assigned);
      await expect(svc.assertCanReparent(ME, [21], 10)).resolves.toBeUndefined();
    });

    it('refuses a target project without write access and a move under a descendant', async () => {
      const svc = build([...nodes, task(13, 11, ME)], { [20 * 1000 + ME]: ['read'] }, assigned);
      await expect(svc.assertCanReparent(ME, [11], 20)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.assertCanReparent(ME, [11], 13)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('rejects a parent chain that already loops', async () => {
    const svc = build([task(11, 12, ME), task(12, 11, ME), task(13, null, ME)]);
    await expect(svc.assertNoCycle(13, 11)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('unknown nodes are 404', async () => {
    await expect(build([]).assertRead(ME, 99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sanitize strips identity and ownership fields', () => {
    const svc = build([]);
    const out = svc.sanitize({
      id: 5,
      ownerId: 9,
      createdBy: 9,
      parent: {},
      children: [],
      createdAt: 1,
      updatedAt: 2,
      title: 'ok',
    });
    expect(out).toEqual({ title: 'ok' });
  });

  it('cannot use a foreign project as a parent', async () => {
    const svc = build([project(10, OTHER)]);
    await expect(svc.assertCanUseAsParent(ME, 10)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.assertCanUseAsParent(ME, null)).resolves.toBeUndefined();
  });
});
