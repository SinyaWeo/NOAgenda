import { NodeService } from '../node.service';
import { Node, NodeStatus, NodeType, RepeatMode } from '../node.entity';

const task = (over: Partial<Node> = {}) =>
  ({
    id: 5,
    type: NodeType.TASK,
    title: 'Write docs',
    parentId: 10,
    createdBy: 3,
    parent: {},
    children: [],
    ...over,
  }) as Node;
const project = (over: Partial<Node> = {}) =>
  ({ id: 10, type: NodeType.PROJECT, name: 'Docs', parentId: null, ownerId: 3, ...over }) as Node;

function build(stored: Node[]) {
  const byId = new Map(stored.map((n) => [n.id, n]));
  const repo: any = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 99, ...x })),
    update: jest.fn(async () => ({})),
    findOne: jest.fn(async ({ where }: any) => byId.get(where.id) ?? null),
    find: jest.fn(async () => stored),
    manager: {
      transaction: jest.fn(async (fn: any) => fn({ query: jest.fn(async () => []), getRepository: () => repo })),
    },
  };
  const events = { emit: jest.fn() };
  return { svc: new NodeService(repo, events as any), events, repo };
}

describe('NodeService announces changes', () => {
  it('create: <type>.created with the node, its owner, and no relations', async () => {
    const { svc, events } = build([]);
    await svc.create({ type: NodeType.TASK, title: 'New', createdBy: 3, parentId: 10 });
    const e = events.emit.mock.calls[0][0];
    expect(e).toMatchObject({ name: 'task.created', nodeId: 99, owner: 3 });
    expect(e.data).not.toHaveProperty('parent');
    expect(e.data).not.toHaveProperty('children');
    expect(e).not.toHaveProperty('projectId'); // looked up later, once the node exists
  });

  it('update: <type>.updated; a project event names itself as the project and its owner', async () => {
    const { svc, events } = build([project()]);
    await svc.update(10, { name: 'Renamed' });
    expect(events.emit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'project.updated', nodeId: 10, projectId: 10, owner: 3 }),
    );
  });

  it('update of a missing node announces nothing', async () => {
    const { svc, events } = build([]);
    expect(await svc.update(404, { title: 'x' })).toBeNull();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('archive and move are updates', async () => {
    const { svc, events } = build([task(), project()]);
    await svc.archive(5);
    await svc.move(5, null);
    expect(events.emit.mock.calls.map((c) => c[0].name)).toEqual(['task.updated', 'task.updated']);
  });

  it('remove: announces <type>.deleted with the project it lived in, found before it vanished', async () => {
    const { svc, events } = build([task(), project()]);
    await svc.remove(5);
    expect(events.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'task.deleted',
        nodeId: 5,
        projectId: 10,
        data: expect.objectContaining({ title: 'Write docs' }),
      }),
    );
  });

  it('remove of a missing node announces nothing', async () => {
    const { svc, events } = build([]);
    await svc.remove(404);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('projectIdOf climbs to the closest project, or null for a personal task', async () => {
    const { svc } = build([
      task({ parentId: 6 }),
      task({ id: 6, parentId: 10 }),
      project(),
      task({ id: 7, parentId: null as any }),
    ]);
    expect(await svc.projectIdOf(task({ parentId: 6 }))).toBe(10);
    expect(await svc.projectIdOf(task({ id: 7, parentId: null as any }))).toBeNull();
  });

  describe('repeating tasks', () => {
    const repeating = (over: Partial<Node> = {}) =>
      task({
        status: NodeStatus.OPEN,
        dueDate: new Date('2030-01-10T09:00:00Z'),
        repeatMode: RepeatMode.DEFAULT,
        repeatAfter: 7,
        ...over,
      });

    it('completing one reopens it with the next due date, and moves its reminders', async () => {
      const { svc, repo, events } = build([repeating()]);
      repo.manager.query = jest.fn(async () => []);
      await svc.update(5, { status: NodeStatus.DONE });
      expect(repo.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ status: NodeStatus.OPEN, percentDone: 0, dueDate: new Date('2030-01-17T09:00:00Z') }),
      );
      expect(repo.update.mock.calls[0][1]).not.toHaveProperty('shiftMs');
      const [sql, params] = repo.manager.query.mock.calls[0];
      expect(sql).toContain('UPDATE task_reminders');
      expect(params[0]).toBe(7 * 24 * 3600);
      expect(params.slice(-1)).toEqual([5]);
      expect(events.emit).toHaveBeenCalledWith(expect.objectContaining({ name: 'task.updated' }));
    });

    it('a non-repeating task just becomes done', async () => {
      const { svc, repo } = build([repeating({ repeatAfter: undefined })]);
      repo.manager.query = jest.fn();
      await svc.update(5, { status: NodeStatus.DONE });
      expect(repo.update).toHaveBeenCalledWith(5, { status: NodeStatus.DONE });
      expect(repo.manager.query).not.toHaveBeenCalled();
    });

    it('other updates to a repeating task are untouched', async () => {
      const { svc, repo } = build([repeating()]);
      await svc.update(5, { title: 'Renamed' });
      expect(repo.update).toHaveBeenCalledWith(5, { title: 'Renamed' });
    });

    it('leaves reminders alone when there was no due date to move them by', async () => {
      const { svc, repo } = build([repeating({ dueDate: undefined })]);
      repo.manager.query = jest.fn();
      await svc.update(5, { status: NodeStatus.DONE });
      expect(repo.manager.query).not.toHaveBeenCalled();
    });

    it('bulk completion: repeating tasks start a new cycle, the others become done', async () => {
      const a = repeating({ id: 5 });
      const b = repeating({ id: 6, repeatAfter: undefined });
      const { svc, repo } = build([a, b]);
      const query = jest.fn(async () => []);
      repo.manager.transaction = jest.fn(async (fn: any) => fn({ query, getRepository: () => repo }));
      await svc.updateMany([5, 6], { status: NodeStatus.DONE });
      expect(repo.update).toHaveBeenCalledWith([6], { status: NodeStatus.DONE });
      expect(repo.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ status: NodeStatus.OPEN, dueDate: new Date('2030-01-17T09:00:00Z') }),
      );
      expect(query).toHaveBeenCalledTimes(1);
    });
  });
});
