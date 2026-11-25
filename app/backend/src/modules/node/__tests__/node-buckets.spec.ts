import { BadRequestException } from '@nestjs/common';
import { asMock } from '../../../common/__tests__/test-utils';
import { NodeService } from '../node.service';
import { Node, NodeStatus, NodeType } from '../node.entity';
import { KanbanBucket } from '../../kanban-bucket/kanban-bucket.entity';

const project = { id: 10, type: NodeType.PROJECT, name: 'P', parentId: null, ownerId: 3 } as Node;
const other = { id: 20, type: NodeType.PROJECT, name: 'Q', parentId: null, ownerId: 3 } as Node;
const task = (over: Partial<Node> = {}) =>
  ({ id: 5, type: NodeType.TASK, title: 'T', parentId: 10, status: NodeStatus.OPEN, ...over }) as Node;
const bucket = (over: Partial<KanbanBucket>) =>
  ({ id: 1, projectId: 10, title: 'B', status: NodeStatus.OPEN, position: 0, ...over }) as KanbanBucket;

function build(nodes: Node[], buckets: KanbanBucket[] = []) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const qb: Record<string, jest.Mock> = {};
  for (const k of ['update', 'set', 'where', 'andWhere']) qb[k] = jest.fn(() => qb);
  qb.execute = jest.fn(async () => undefined);
  const bucketRepo = {
    findOne: jest.fn(async ({ where }: { where: { id: number } }) => buckets.find((b) => b.id === where.id) ?? null),
    find: jest.fn(async ({ where }: { where: { projectId: number } }) =>
      buckets.filter((b) => b.projectId === where.projectId),
    ),
    insert: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
  };
  const nodeRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 99, ...x })),
    update: jest.fn(async () => ({})),
    findOne: jest.fn(async ({ where }: { where: { id: number } }) => byId.get(where.id) ?? null),
    find: jest.fn(async () => nodes),
    manager: {
      query: jest.fn(async (_sql?: string, _params?: unknown[]): Promise<unknown[]> => [{ language: 'cs' }]),
      getRepository: jest.fn(() => bucketRepo),
      createQueryBuilder: jest.fn(() => qb),
      transaction: jest.fn(async (fn: (m: object) => unknown) =>
        fn({ query: jest.fn(async () => []), getRepository: () => nodeRepo, createQueryBuilder: () => qb }),
      ),
    },
  };
  const translator = { t: jest.fn((lang: string, key: string) => `${lang}:${key}`) };
  const svc = new NodeService(asMock(nodeRepo), asMock({ emit: jest.fn() }), asMock(translator));
  return { svc, nodeRepo, bucketRepo, qb };
}

describe('NodeService kanban buckets', () => {
  it('a new project gets one bucket per status in its creator’s language', async () => {
    const { svc, bucketRepo, nodeRepo } = build([]);
    await svc.create({ type: NodeType.PROJECT, name: 'New', ownerId: 3 }, 3);
    expect(nodeRepo.manager.query).toHaveBeenCalledWith(expect.stringContaining('language'), [3]);
    expect(bucketRepo.insert).toHaveBeenCalledWith([
      { projectId: 99, status: NodeStatus.OPEN, position: 0, title: 'cs:kanban.default.open' },
      { projectId: 99, status: NodeStatus.IN_PROGRESS, position: 1, title: 'cs:kanban.default.in_progress' },
      { projectId: 99, status: NodeStatus.DONE, position: 2, title: 'cs:kanban.default.done' },
    ]);
  });

  it('a task does not seed buckets', async () => {
    const { svc, bucketRepo } = build([project]);
    await svc.create({ type: NodeType.TASK, title: 'x', parentId: 10 });
    expect(bucketRepo.insert).not.toHaveBeenCalled();
  });

  it('placing a task in a bucket gives it the bucket’s status', async () => {
    const { svc, nodeRepo } = build([project, task()], [bucket({ id: 2, status: NodeStatus.DONE })]);
    await svc.update(5, { bucketId: 2 });
    expect(nodeRepo.update).toHaveBeenCalledWith(5, expect.objectContaining({ bucketId: 2, status: NodeStatus.DONE }));
  });

  it('refuses a bucket of another project, and a status that contradicts the bucket', async () => {
    const { svc, nodeRepo } = build(
      [project, other, task()],
      [bucket({ id: 2, projectId: 20 }), bucket({ id: 3, status: NodeStatus.DONE })],
    );
    await expect(svc.update(5, { bucketId: 2 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.update(5, { bucketId: 404 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.update(5, { bucketId: 3, status: NodeStatus.OPEN })).rejects.toBeInstanceOf(BadRequestException);
    expect(nodeRepo.update).not.toHaveBeenCalled();
  });

  it('a bucket is checked against the project the task is moving to', async () => {
    const { svc, nodeRepo } = build([project, other, task()], [bucket({ id: 2, projectId: 20 })]);
    await svc.update(5, { parentId: 20, bucketId: 2 });
    expect(nodeRepo.update).toHaveBeenCalledWith(5, expect.objectContaining({ parentId: 20, bucketId: 2 }));
  });

  it('a status change releases a bucket that no longer matches', async () => {
    const { svc, qb } = build([project, task({ bucketId: 1 })], [bucket({ id: 1 })]);
    await svc.update(5, { status: NodeStatus.DONE });
    expect(qb.set).toHaveBeenCalledWith({ bucketId: null });
    expect(qb.execute).toHaveBeenCalled();
  });

  it('an update without a status change leaves buckets alone', async () => {
    const { svc, qb } = build([project, task({ bucketId: 1 })], [bucket({ id: 1 })]);
    await svc.update(5, { title: 'Renamed' });
    expect(qb.execute).not.toHaveBeenCalled();
  });

  it('changing parent or moving takes the task out of its bucket', async () => {
    const { svc, nodeRepo } = build([project, other, task({ bucketId: 1 })], [bucket({ id: 1 })]);
    await svc.update(5, { parentId: 20 });
    expect(nodeRepo.update).toHaveBeenCalledWith(5, expect.objectContaining({ parentId: 20, bucketId: null }));
    await svc.move(5, 20);
    expect(nodeRepo.update).toHaveBeenLastCalledWith(5, { parentId: 20, bucketId: null });
  });

  it('bulk updates never place tasks in a bucket', async () => {
    const { svc, nodeRepo } = build([project, task()], [bucket({ id: 1 })]);
    await svc.updateMany([5], { bucketId: 1, priority: 2 });
    expect(nodeRepo.update).toHaveBeenCalledWith([5], { priority: 2 });
  });

  it('a duplicated project copies the original’s buckets', async () => {
    const { svc, bucketRepo } = build(
      [project],
      [
        bucket({ id: 1, title: 'Backlog' }),
        bucket({ id: 2, title: 'Shipped', status: NodeStatus.DONE, position: 1, limit: 3 }),
      ],
    );
    await svc.duplicate(10, 3);
    expect(bucketRepo.delete).toHaveBeenCalledWith({ projectId: 99 });
    expect(bucketRepo.insert).toHaveBeenLastCalledWith([
      { projectId: 99, title: 'Backlog', status: NodeStatus.OPEN, position: 0, limit: undefined },
      { projectId: 99, title: 'Shipped', status: NodeStatus.DONE, position: 1, limit: 3 },
    ]);
  });
});

describe('NodeService relative reminders', () => {
  it('a new due date recalculates reminders set relative to it, in their creator’s time zone', async () => {
    const { svc, nodeRepo } = build([project, task({ dueDate: new Date('2030-01-01T11:00:00Z') })]);
    nodeRepo.manager.query.mockImplementation(async (sql?: string) =>
      String(sql).includes('FROM task_reminders r')
        ? [
            {
              id: 7,
              daysBefore: 1,
              atTime: '09:00',
              dueDate: new Date('2030-02-10T11:00:00Z'),
              timezone: 'Europe/Prague',
            },
          ]
        : [],
    );
    await svc.update(5, { dueDate: new Date('2030-02-10T11:00:00Z') });
    const call = nodeRepo.manager.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE task_reminders'));
    expect(call?.[1]?.[0]).toEqual(new Date('2030-02-09T08:00:00Z'));
    expect(call?.[1]?.[4]).toBe(7);
  });

  it('leaves reminders alone when the due date does not change', async () => {
    const { svc, nodeRepo } = build([project, task()]);
    await svc.update(5, { title: 'x' });
    expect(nodeRepo.manager.query.mock.calls.some(([sql]) => String(sql).includes('task_reminders'))).toBe(false);
  });
});
