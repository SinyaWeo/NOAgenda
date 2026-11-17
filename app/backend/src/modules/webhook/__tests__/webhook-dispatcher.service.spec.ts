import { createHmac } from 'crypto';
import { WebhookDispatcher, MAX_CONSECUTIVE_FAILURES } from '../webhook-dispatcher.service';
import { Access } from '../../node/node-access.service';

const hook = (over: Record<string, unknown> = {}) => ({
  id: 1,
  url: 'https://hooks.example.com/in',
  event: '*',
  active: true,
  secret: null,
  projectId: null,
  userId: null,
  failureCount: 0,
  ...over,
});

function build(hooks: any[], opts: { levels?: Record<number, Access>; nodes?: any[] } = {}) {
  const repo: any = {
    find: jest.fn(async () => hooks),
    update: jest.fn(async () => ({})),
    increment: jest.fn(async () => ({})),
    findOne: jest.fn(async () => ({ id: 1, failureCount: 1, active: true })),
  };
  const nodes: any = {
    findOne: jest.fn(async ({ where }: any) => (opts.nodes ?? []).find((n) => n.id === where.id) ?? null),
  };
  const access: any = { level: jest.fn(async (u: number) => opts.levels?.[u] ?? Access.NONE) };
  const bus: any = { on: jest.fn() };
  return { svc: new WebhookDispatcher(repo, nodes, access, bus), repo, access, bus };
}

describe('WebhookDispatcher.recipientsOf', () => {
  const event = { name: 'task.updated', data: {}, nodeId: 5, projectId: 10, owner: 3 };

  it('gives a project webhook only the events of its own project', async () => {
    const { svc } = build([hook({ id: 1, projectId: 10 }), hook({ id: 2, projectId: 11 })]);
    expect((await svc.recipientsOf(event)).map((h) => h.id)).toEqual([1]);
  });

  it('gives a user webhook the events of projects the user can read', async () => {
    const { svc } = build([hook({ id: 1, userId: 7 }), hook({ id: 2, userId: 8 })], { levels: { 7: Access.READ } });
    expect((await svc.recipientsOf(event)).map((h) => h.id)).toEqual([1]);
  });

  it('never leaks a project event to a user without access', async () => {
    const { svc } = build([hook({ userId: 8 })], { levels: { 8: Access.NONE } });
    expect(await svc.recipientsOf(event)).toEqual([]);
  });

  it('gives the owner their personal task events, and nobody else', async () => {
    const { svc } = build([hook({ id: 1, userId: 3 }), hook({ id: 2, userId: 4 })]);
    const personal = { name: 'task.created', data: {}, nodeId: 5, projectId: null, owner: 3 };
    expect((await svc.recipientsOf(personal)).map((h) => h.id)).toEqual([1]);
  });

  it('keeps delivering a deleted project to its owner although it no longer exists', async () => {
    const { svc } = build([hook({ userId: 3 })]);
    const gone = { name: 'project.deleted', data: {}, nodeId: 10, projectId: 10, owner: 3 };
    expect(await svc.recipientsOf(gone)).toHaveLength(1);
  });

  it('looks the project up when the event did not say (comments)', async () => {
    const { svc } = build([hook({ projectId: 10 })], {
      nodes: [
        { id: 5, type: 'task', parentId: 9 },
        { id: 9, type: 'task', parentId: 10 },
        { id: 10, type: 'project', parentId: null },
      ],
    });
    expect(await svc.recipientsOf({ name: 'comment.created', data: {}, nodeId: 5 })).toHaveLength(1);
  });

  it('queries only active webhooks for this event or "*"', async () => {
    const { svc, repo } = build([]);
    await svc.recipientsOf(event);
    expect(repo.find).toHaveBeenCalledWith({
      where: [
        { active: true, event: 'task.updated' },
        { active: true, event: '*' },
      ],
    });
  });
});

describe('WebhookDispatcher.deliverOnce', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.WEBHOOK_ALLOW_PRIVATE;
  });
  const mockFetch = (status: number) => (global.fetch = jest.fn(async () => ({ status, body: null })) as any);

  it('POSTs JSON with an HMAC signature when there is a secret', async () => {
    const f = mockFetch(200);
    const { svc } = build([]);
    const r = await svc.deliverOnce({ url: 'https://1.1.1.1/hook', secret: 's3cret' }, 'task.created', { id: 1 });
    expect(r).toMatchObject({ ok: true, status: 200 });
    const [, init] = f.mock.calls[0] as any;
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('manual');
    expect(init.headers['X-NOAgenda-Event']).toBe('task.created');
    expect(init.headers['X-NOAgenda-Signature']).toBe(
      'sha256=' + createHmac('sha256', 's3cret').update(init.body).digest('hex'),
    );
    expect(JSON.parse(init.body)).toMatchObject({ event: 'task.created', data: { id: 1 } });
  });

  it('sends no signature without a secret', async () => {
    const f = mockFetch(204);
    const { svc } = build([]);
    await svc.deliverOnce({ url: 'https://1.1.1.1/hook', secret: undefined }, 'x', {});
    expect((f.mock.calls[0] as any)[1].headers['X-NOAgenda-Signature']).toBeUndefined();
  });

  it.each([
    [500, true],
    [429, true],
    [404, false],
    [302, false],
  ])('status %i: failure, retry=%p', async (status, retry) => {
    mockFetch(status);
    const { svc } = build([]);
    const r = await svc.deliverOnce({ url: 'https://1.1.1.1/hook' }, 'x', {});
    expect(r).toMatchObject({ ok: false, status, retry });
  });

  it('retries network errors', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as any;
    const { svc } = build([]);
    expect(await svc.deliverOnce({ url: 'https://1.1.1.1/hook' }, 'x', {})).toMatchObject({
      ok: false,
      status: null,
      retry: true,
      error: 'ECONNREFUSED',
    });
  });

  it('refuses internal addresses without connecting (and does not retry)', async () => {
    const f = mockFetch(200);
    const { svc } = build([]);
    const r = await svc.deliverOnce({ url: 'http://169.254.169.254/latest' }, 'x', {});
    expect(r).toMatchObject({ ok: false, retry: false });
    expect(f).not.toHaveBeenCalled();
  });
});

describe('WebhookDispatcher.record', () => {
  it('stores success and resets the failure streak', async () => {
    const { svc, repo } = build([]);
    await svc.record(1, { ok: true, status: 200, error: null });
    expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({ lastStatus: 200, failureCount: 0 }));
  });

  it('counts failures and switches the webhook off after too many in a row', async () => {
    const { svc, repo } = build([]);
    repo.findOne.mockResolvedValue({ id: 1, failureCount: MAX_CONSECUTIVE_FAILURES, active: true });
    await svc.record(1, { ok: false, status: 500, error: 'HTTP 500' });
    expect(repo.increment).toHaveBeenCalledWith({ id: 1 }, 'failureCount', 1);
    expect(repo.update).toHaveBeenLastCalledWith(1, { active: false });
  });

  it('keeps it on below the limit', async () => {
    const { svc, repo } = build([]);
    await svc.record(1, { ok: false, status: null, error: 'Timed out' });
    expect(repo.update).not.toHaveBeenCalledWith(1, { active: false });
  });
});
