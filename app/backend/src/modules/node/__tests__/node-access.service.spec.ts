import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Access, NodeAccessService } from '../node-access.service';
import { NodeType } from '../node.entity';

type N = { id: number; type: NodeType; ownerId?: number | null; createdBy?: number | null; parentId?: number | null };

function build(nodes: N[], grants: Record<number, string[]> = {}) {
  const repo: any = {
    findOne: jest.fn(async ({ where }: any) => nodes.find((n) => n.id === where.id) ?? null),
    manager: {
      // args: [projectId, userId, projectId, userId]
      query: jest.fn(async (_sql: string, args: any[]) =>
        (grants[args[0] * 1000 + args[1]] ?? []).map((permission) => ({ permission }))),
    },
  };
  return new NodeAccessService(repo);
}

const ME = 1;
const OTHER = 2;
const project = (id: number, ownerId: number | null): N => ({ id, type: NodeType.PROJECT, ownerId });
const task = (id: number, parentId: number | null, createdBy: number | null): N =>
  ({ id, type: NodeType.TASK, parentId, createdBy });

describe('NodeAccessService', () => {
  it('owner has ADMIN on project and on its tasks/subtasks', async () => {
    const svc = build([project(10, ME), task(11, 10, OTHER), task(12, 11, OTHER)]);
    expect(await svc.level(ME, 10)).toBe(Access.ADMIN);
    expect(await svc.level(ME, 11)).toBe(Access.ADMIN);
    expect(await svc.level(ME, 12)).toBe(Access.ADMIN);
  });

  it('a stranger has NONE on someone else\'s project, tasks and subtasks', async () => {
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

  it('a task creator keeps access to their own task but not to the parent project', async () => {
    const svc = build([project(10, OTHER), task(11, 10, ME)]);
    expect(await svc.level(ME, 11)).toBe(Access.ADMIN);
    expect(await svc.level(ME, 10)).toBe(Access.NONE);
  });

  it('unknown nodes are 404', async () => {
    await expect(build([]).assertRead(ME, 99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sanitize strips identity and ownership fields', () => {
    const svc = build([]);
    const out = svc.sanitize({ id: 5, ownerId: 9, createdBy: 9, parent: {}, children: [], createdAt: 1, updatedAt: 2, title: 'ok' });
    expect(out).toEqual({ title: 'ok' });
  });

  it('cannot use a foreign project as a parent', async () => {
    const svc = build([project(10, OTHER)]);
    await expect(svc.assertCanUseAsParent(ME, 10)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.assertCanUseAsParent(ME, null)).resolves.toBeUndefined();
  });
});
