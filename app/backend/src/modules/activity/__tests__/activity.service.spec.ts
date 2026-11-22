import { asMock } from '../../../common/__tests__/test-utils';
import { DomainEvent, DomainEvents } from '../../../common/domain-events';
import { NodeService } from '../../node/node.service';
import { Activity } from '../activity.entity';
import { ActivityService, retentionDays } from '../activity.service';

function build(opts: { projectOwner?: number } = {}) {
  const saved: Partial<Activity>[] = [];
  const repo = {
    create: jest.fn((x: Partial<Activity>) => x),
    save: jest.fn(async (x: Partial<Activity>) => {
      saved.push(x);
      return x;
    }),
    delete: jest.fn(async () => ({ affected: 4 })),
    manager: { query: jest.fn(async () => [{ username: 'alice' }]) },
  };
  const nodes = {
    projectIdOf: jest.fn(async (n: { id: number; type: string; parentId: number | null }) =>
      n.type === 'project' ? n.id : n.parentId,
    ),
    findById: jest.fn(async (id: number) =>
      id === 10 ? { id: 10, type: 'project', ownerId: opts.projectOwner ?? 3 } : { id: id, type: 'task', parentId: 10 },
    ),
  };
  const svc = new ActivityService(asMock(repo), asMock<DomainEvents>({ on: jest.fn() }), asMock<NodeService>(nodes));
  return { svc, repo, saved, nodes };
}

const taskEvent = (over: Partial<DomainEvent> = {}): DomainEvent => ({
  name: 'task.updated',
  data: { id: 5, type: 'task', title: 'Write docs', parentId: 10 },
  nodeId: 5,
  owner: 7,
  actorId: 2,
  changes: { title: { from: 'a', to: 'b' } },
  ...over,
});

describe('ActivityService.record', () => {
  it('stores who did what to which node, with names snapshotted', async () => {
    const { svc, saved } = build();
    await svc.record(taskEvent());
    expect(saved[0]).toMatchObject({
      nodeId: 5,
      projectId: 10,
      actorId: 2,
      actorName: 'alice',
      ownerId: 3, // the project's owner, not the task creator
      nodeType: 'task',
      nodeTitle: 'Write docs',
      action: 'task.updated',
      changes: { title: { from: 'a', to: 'b' } },
    });
  });

  it('skips an update that changed nothing', async () => {
    const { svc, repo } = build();
    await expect(svc.record(taskEvent({ changes: {} }))).resolves.toBeNull();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('keeps a deleted project with its owner (the project row is already gone)', async () => {
    const { svc, saved } = build();
    await svc.record({
      name: 'project.deleted',
      data: { id: 10, type: 'project', name: 'Docs', parentId: null },
      nodeId: 10,
      projectId: 10,
      owner: 9,
      actorId: 9,
      changes: { descendants: { from: 3, to: 0 } },
    });
    expect(saved[0]).toMatchObject({ nodeType: 'project', nodeTitle: 'Docs', ownerId: 9, projectId: 10 });
  });

  it('uses the event title and looks the project up for events that carry no node data', async () => {
    const { svc, saved, nodes } = build();
    await svc.record({
      name: 'comment.created',
      data: { id: 1 },
      nodeId: 5,
      owner: 7,
      actorId: 2,
      title: 'Write docs',
    });
    expect(nodes.findById).toHaveBeenCalledWith(5);
    expect(saved[0]).toMatchObject({ nodeTitle: 'Write docs', projectId: 10, nodeType: 'task', changes: null });
  });

  it('a personal task belongs to its creator', async () => {
    const { svc, saved } = build();
    await svc.record(taskEvent({ data: { id: 5, type: 'task', title: 'Mine', parentId: null }, owner: 7 }));
    expect(saved[0]).toMatchObject({ projectId: null, ownerId: 7 });
  });
});

describe('ActivityService retention', () => {
  it('purges what is older than the retention period', async () => {
    const { svc, repo } = build();
    await expect(svc.purgeOld(new Date('2026-11-22T00:00:00Z'))).resolves.toBe(4);
    const where = (repo.delete.mock.calls[0] as unknown as [{ createdAt: { _value: Date } }])[0];
    expect(where.createdAt._value.toISOString()).toBe('2025-11-22T00:00:00.000Z');
  });

  it('retentionDays defaults to a year and accepts a positive number', () => {
    expect(retentionDays(undefined)).toBe(365);
    expect(retentionDays('abc')).toBe(365);
    expect(retentionDays('0')).toBe(365);
    expect(retentionDays('30')).toBe(30);
  });
});
