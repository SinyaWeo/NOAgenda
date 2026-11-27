import { asMock } from '../../../common/__tests__/test-utils';
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

type RepoMock = Record<'create' | 'save' | 'update' | 'findOne' | 'find', jest.Mock> & {
  manager: { transaction: jest.Mock; query: jest.Mock; createQueryBuilder: jest.Mock };
};

/** A query builder that accepts any chain (used to release kanban buckets after a status change). */
function chain(): Record<string, jest.Mock> {
  const qb: Record<string, jest.Mock> = {};
  for (const k of ['update', 'set', 'where', 'andWhere']) qb[k] = jest.fn(() => qb);
  qb.execute = jest.fn(async () => undefined);
  return qb;
}

function build(stored: Node[]) {
  const byId = new Map(stored.map((n) => [n.id, n]));
  const repo: RepoMock = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 99, ...x })),
    update: jest.fn(async () => ({})),
    findOne: jest.fn(async ({ where }: { where: { id: number } }) => byId.get(where.id) ?? null),
    find: jest.fn(async () => stored),
    manager: {
      query: jest.fn(async () => []),
      createQueryBuilder: jest.fn(chain),
      transaction: jest.fn(async (fn: (m: object) => unknown) =>
        fn({ query: jest.fn(async () => []), getRepository: () => repo, createQueryBuilder: chain }),
      ),
    },
  };
  const events = { emit: jest.fn() };
  return {
    svc: new NodeService(asMock(repo), asMock(events), asMock({ t: (_l: string, k: string) => k })),
    events,
    repo,
  };
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
      task({ id: 7, parentId: null }),
    ]);
    expect(await svc.projectIdOf(task({ parentId: 6 }))).toBe(10);
    expect(await svc.projectIdOf(task({ id: 7, parentId: null }))).toBeNull();
  });

  describe('reschedule (Gantt)', () => {
    const d = (s: string) => new Date(s);
    const two = () => [
      task({ id: 5, startDate: d('2026-12-01T11:00:00Z'), dueDate: d('2026-12-03T11:00:00Z') }),
      task({ id: 6, startDate: d('2026-12-04T11:00:00Z'), dueDate: d('2026-12-05T11:00:00Z') }),
    ];

    it('writes every task in one transaction, realigns reminders only where the due date moved, and announces each', async () => {
      const { svc, repo, events } = build(two());
      const inner = {
        query: jest.fn(async (_sql: string, _params?: unknown[]) => []),
        getRepository: () => repo,
        createQueryBuilder: chain,
      };
      repo.manager.transaction.mockImplementation(async (fn: (m: object) => unknown) => fn(inner));
      await svc.reschedule(
        [
          { id: 5, startDate: d('2026-12-02T11:00:00Z'), dueDate: d('2026-12-04T11:00:00Z') },
          { id: 6, startDate: d('2026-12-05T11:00:00Z'), dueDate: d('2026-12-05T11:00:00Z') },
        ],
        3,
      );
      expect(repo.manager.transaction).toHaveBeenCalledTimes(1);
      expect(repo.update).toHaveBeenCalledWith(5, {
        startDate: d('2026-12-02T11:00:00Z'),
        dueDate: d('2026-12-04T11:00:00Z'),
      });
      expect(repo.update).toHaveBeenCalledWith(6, expect.objectContaining({ startDate: d('2026-12-05T11:00:00Z') }));
      // Relative reminders are looked up for task 5 only (6 kept its due date).
      const reminderLookups = inner.query.mock.calls.filter(([sql]) => String(sql).includes('task_reminders'));
      expect(reminderLookups.length).toBeGreaterThan(0);
      for (const [, params] of reminderLookups) expect(params).toEqual([5]);
      const emitted = events.emit.mock.calls.map((c) => c[0]);
      expect(emitted.map((e) => [e.name, e.nodeId, e.actorId])).toEqual([
        ['task.updated', 5, 3],
        ['task.updated', 6, 3],
      ]);
      expect(Object.keys(emitted[0].changes).sort()).toEqual(['dueDate', 'startDate']);
      expect(Object.keys(emitted[1].changes)).toEqual(['startDate']);
    });

    it('refuses a start after the due date, a task listed twice, or a missing task, before writing', async () => {
      const { svc, repo } = build(two());
      await expect(
        svc.reschedule([{ id: 5, startDate: d('2026-12-09T11:00:00Z'), dueDate: d('2026-12-03T11:00:00Z') }]),
      ).rejects.toThrow(/start after/);
      await expect(
        svc.reschedule([
          { id: 5, startDate: null, dueDate: d('2026-12-03T11:00:00Z') },
          { id: 5, startDate: null, dueDate: d('2026-12-04T11:00:00Z') },
        ]),
      ).rejects.toThrow(/only once/);
      const { svc: one, repo: repo1 } = build([two()[0]]);
      await expect(
        one.reschedule([
          { id: 5, startDate: null, dueDate: d('2026-12-03T11:00:00Z') },
          { id: 404, startDate: null, dueDate: d('2026-12-03T11:00:00Z') },
        ]),
      ).rejects.toThrow(/Not Found/);
      expect(repo.update).not.toHaveBeenCalled();
      expect(repo1.update).not.toHaveBeenCalled();
    });
  });

  describe('repeating tasks', () => {
    const sqlCalls = (query: jest.Mock, fragment: string) =>
      query.mock.calls.filter(([sql]) => String(sql).includes(fragment)) as [string, unknown[]][];

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
      const [sql, params] = sqlCalls(repo.manager.query, 'UPDATE task_reminders')[0];
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
      repo.manager.query = jest.fn(async () => []);
      await svc.update(5, { status: NodeStatus.DONE });
      expect(sqlCalls(repo.manager.query, 'UPDATE task_reminders')).toHaveLength(0);
    });

    it('works out the next date in the time zone of whoever completes it', async () => {
      // Due 09:00 in Prague on the Saturday before the clocks go forward (2030-03-31): a week later it is
      // still 09:00 in Prague, which is one hour earlier in UTC.
      const { svc, repo } = build([repeating({ dueDate: new Date('2030-03-30T08:00:00Z') })]);
      repo.manager.query = jest.fn(async (sql: string) =>
        sql.includes('FROM users') ? [{ timezone: 'Europe/Prague' }] : [],
      );
      await svc.update(5, { status: NodeStatus.DONE }, 9);
      expect(repo.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ dueDate: new Date('2030-04-06T07:00:00Z') }),
      );
    });

    it('records every completion of a repeating task, who made it and for which due date', async () => {
      const { svc, repo } = build([repeating()]);
      repo.manager.query = jest.fn(async () => []);
      await svc.update(5, { status: NodeStatus.DONE }, 9);
      const [, params] = sqlCalls(repo.manager.query, 'INSERT INTO task_completions')[0];
      expect(params[0]).toBe(5);
      expect(params[2]).toBe(9);
      expect(params[3]).toEqual(new Date('2030-01-10T09:00:00Z'));
    });

    it('a new cycle reopens done subtasks', async () => {
      const { svc, repo } = build([repeating()]);
      repo.manager.query = jest.fn(async (sql: string) =>
        sql.includes('WITH RECURSIVE') ? [{ id: 8 }, { id: 9 }] : [],
      );
      await svc.update(5, { status: NodeStatus.DONE });
      const [sql, params] = sqlCalls(repo.manager.query, 'UPDATE nodes SET status')[0];
      expect(sql).toContain("status = 'open'");
      expect(params).toEqual([8, 9]);
    });

    it('a task that opts out keeps its done subtasks done', async () => {
      const { svc, repo } = build([repeating({ repeatResetSubtasks: false })]);
      repo.manager.query = jest.fn(async (sql: string) =>
        sql.includes('WITH RECURSIVE') ? [{ id: 8 }, { id: 9 }] : [],
      );
      await svc.update(5, { status: NodeStatus.DONE });
      expect(repo.update).toHaveBeenCalledWith(5, expect.objectContaining({ status: NodeStatus.OPEN }));
      expect(sqlCalls(repo.manager.query, 'WITH RECURSIVE')).toHaveLength(0);
      expect(sqlCalls(repo.manager.query, 'UPDATE nodes SET status')).toHaveLength(0);
    });

    it('the opt-out saved together with the completion applies to that cycle', async () => {
      const { svc, repo } = build([repeating()]);
      repo.manager.query = jest.fn(async () => []);
      await svc.update(5, { status: NodeStatus.DONE, repeatResetSubtasks: false });
      expect(sqlCalls(repo.manager.query, 'WITH RECURSIVE')).toHaveLength(0);
    });

    it('the last occurrence of a limited series is just done, and is still recorded', async () => {
      const { svc, repo } = build([repeating({ repeatCount: 1 })]);
      repo.manager.query = jest.fn(async () => []);
      await svc.update(5, { status: NodeStatus.DONE });
      expect(repo.update).toHaveBeenCalledWith(5, { status: NodeStatus.DONE });
      expect(sqlCalls(repo.manager.query, 'INSERT INTO task_completions')).toHaveLength(1);
      expect(sqlCalls(repo.manager.query, 'UPDATE task_reminders')).toHaveLength(0);
    });

    it('counts occurrences down', async () => {
      const { svc, repo } = build([repeating({ repeatCount: 3 })]);
      repo.manager.query = jest.fn(async () => []);
      await svc.update(5, { status: NodeStatus.DONE });
      expect(repo.update).toHaveBeenCalledWith(5, expect.objectContaining({ status: NodeStatus.OPEN, repeatCount: 2 }));
    });

    it('bulk completion: repeating tasks start a new cycle, the others become done', async () => {
      const a = repeating({ id: 5 });
      const b = repeating({ id: 6, repeatAfter: undefined });
      const { svc, repo } = build([a, b]);
      const query = jest.fn(async () => []);
      repo.manager.transaction = jest.fn(async (fn: (m: object) => unknown) =>
        fn({ query, getRepository: () => repo, createQueryBuilder: chain }),
      );
      await svc.updateMany([5, 6], { status: NodeStatus.DONE });
      expect(repo.update).toHaveBeenCalledWith([6], { status: NodeStatus.DONE });
      expect(repo.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ status: NodeStatus.OPEN, dueDate: new Date('2030-01-17T09:00:00Z') }),
      );
      expect(sqlCalls(query, 'UPDATE task_reminders')).toHaveLength(1);
      expect(sqlCalls(query, 'INSERT INTO task_completions')).toHaveLength(1); // only the repeating one
    });

    it('bulk completion reopens subtasks only below the tasks that do not opt out', async () => {
      const a = repeating({ id: 5 });
      const b = repeating({ id: 6, repeatResetSubtasks: false });
      const { svc, repo } = build([a, b]);
      const query = jest.fn(async (_sql: string, _params?: unknown[]) => []);
      repo.manager.transaction = jest.fn(async (fn: (m: object) => unknown) =>
        fn({ query, getRepository: () => repo, createQueryBuilder: chain }),
      );
      await svc.updateMany([5, 6], { status: NodeStatus.DONE });
      const lookups = sqlCalls(query, 'WITH RECURSIVE');
      expect(lookups).toHaveLength(1);
      expect(lookups[0][1]).toContain(5);
      expect(lookups[0][1]).not.toContain(6);
    });
  });

  it('update: names the actor and the fields that changed', async () => {
    const { svc, events } = build([task({ title: 'Old', priority: 1 })]);
    await svc.update(5, { title: 'New', priority: 1 }, 8);
    expect(events.emit.mock.calls[0][0]).toMatchObject({
      actorId: 8,
      changes: { title: { from: 'Old', to: 'New' } },
    });
    expect(Object.keys(events.emit.mock.calls[0][0].changes)).toEqual(['title']);
  });

  it('update: a change of position only is announced with no changes (the log skips it)', async () => {
    const { svc, events } = build([task({ position: 1 })]);
    await svc.update(5, { position: 2 }, 8);
    expect(events.emit.mock.calls[0][0].changes).toEqual({});
  });

  it('move: records the old and new parent and the actor', async () => {
    const { svc, events } = build([task({ parentId: 10 })]);
    await svc.move(5, 11, 8);
    expect(events.emit.mock.calls[0][0]).toMatchObject({
      actorId: 8,
      changes: { parentId: { from: 10, to: 11 } },
    });
  });

  it('archive and unarchive record the actor and the flag', async () => {
    const { svc, events } = build([project()]);
    await svc.archive(10, 8);
    await svc.unarchive(10, 8);
    expect(events.emit.mock.calls[0][0]).toMatchObject({
      actorId: 8,
      changes: { isArchived: { from: false, to: true } },
    });
    expect(events.emit.mock.calls[1][0]).toMatchObject({
      actorId: 8,
      changes: { isArchived: { from: true, to: false } },
    });
  });

  it('remove: records the actor and how many descendants went with it', async () => {
    const { svc, events } = build([task(), project()]);
    await svc.remove(5, 8);
    const e = events.emit.mock.calls[0][0];
    expect(e).toMatchObject({ name: 'task.deleted', actorId: 8, projectId: 10 });
    expect(e.changes.descendants).toEqual({ from: 0, to: 0 });
  });
});
