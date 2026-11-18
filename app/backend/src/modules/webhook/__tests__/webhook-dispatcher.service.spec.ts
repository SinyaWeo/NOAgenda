import { createHmac } from 'crypto';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { BLOCKED_ADDRESS } from '../../../common/url-guard';
import { WebhookDispatcher, MAX_CONSECUTIVE_FAILURES } from '../webhook-dispatcher.service';
import { Access, NodeAccessService } from '../../node/node-access.service';
import { Repository } from 'typeorm';
import { Webhook } from '../webhook.entity';
import { Node } from '../../node/node.entity';
import { DomainEvents } from '../../../common/domain-events';
import { asMock, type Mocks } from '../../../common/__tests__/test-utils';

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

type NodeRow = { id: number; type: string; parentId: number | null };

function build(hooks: object[], opts: { levels?: Record<number, Access>; nodes?: NodeRow[] } = {}) {
  const repo: Mocks = {
    find: jest.fn(async () => hooks),
    update: jest.fn(async () => ({})),
    increment: jest.fn(async () => ({})),
    findOne: jest.fn(async () => ({ id: 1, failureCount: 1, active: true })),
  };
  const nodes: Mocks = {
    findOne: jest.fn(
      async ({ where }: { where: { id: number } }) => (opts.nodes ?? []).find((n) => n.id === where.id) ?? null,
    ),
  };
  const access: Mocks = { level: jest.fn(async (u: number) => opts.levels?.[u] ?? Access.NONE) };
  const bus: Mocks = { on: jest.fn() };
  return {
    svc: new WebhookDispatcher(
      asMock<Repository<Webhook>>(repo),
      asMock<Repository<Node>>(nodes),
      asMock<NodeAccessService>(access),
      asMock<DomainEvents>(bus),
    ),
    repo,
    access,
    bus,
  };
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
  afterEach(() => {
    delete process.env.WEBHOOK_ALLOW_PRIVATE;
  });
  const mockSend = (svc: WebhookDispatcher, status: number) => {
    const send = jest.fn(async () => status);
    svc.send = asMock<WebhookDispatcher['send']>(send);
    return send;
  };

  it('POSTs JSON with an HMAC signature when there is a secret', async () => {
    const { svc } = build([]);
    const send = mockSend(svc, 200);
    const r = await svc.deliverOnce({ url: 'https://1.1.1.1/hook', secret: 's3cret' }, 'task.created', { id: 1 });
    expect(r).toMatchObject({ ok: true, status: 200 });
    const [url, headers, body] = send.mock.calls[0] as unknown as [string, Record<string, string>, string];
    expect(url).toBe('https://1.1.1.1/hook');
    expect(headers['X-NOAgenda-Event']).toBe('task.created');
    expect(headers['X-NOAgenda-Signature']).toBe('sha256=' + createHmac('sha256', 's3cret').update(body).digest('hex'));
    expect(JSON.parse(body)).toMatchObject({ event: 'task.created', data: { id: 1 } });
  });

  it('sends no signature without a secret', async () => {
    const { svc } = build([]);
    const send = mockSend(svc, 204);
    await svc.deliverOnce({ url: 'https://1.1.1.1/hook', secret: undefined }, 'x', {});
    expect(
      (send.mock.calls[0] as unknown as [string, Record<string, string>])[1]['X-NOAgenda-Signature'],
    ).toBeUndefined();
  });

  it.each([
    [500, true],
    [429, true],
    [404, false],
    [302, false],
  ])('status %i: failure, retry=%p', async (status, retry) => {
    const { svc } = build([]);
    mockSend(svc, status);
    const r = await svc.deliverOnce({ url: 'https://1.1.1.1/hook' }, 'x', {});
    expect(r).toMatchObject({ ok: false, status, retry });
  });

  it('retries network errors', async () => {
    const { svc } = build([]);
    svc.send = jest.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    expect(await svc.deliverOnce({ url: 'https://1.1.1.1/hook' }, 'x', {})).toMatchObject({
      ok: false,
      status: null,
      retry: true,
      error: 'ECONNREFUSED',
    });
  });

  it('does not retry when the connect-time lookup found an internal address (DNS rebinding)', async () => {
    const { svc } = build([]);
    svc.send = jest.fn(async () => {
      throw Object.assign(new Error('url must point to a public address'), { code: BLOCKED_ADDRESS });
    });
    expect(await svc.deliverOnce({ url: 'https://1.1.1.1/hook' }, 'x', {})).toMatchObject({ ok: false, retry: false });
  });

  it('refuses internal addresses without connecting (and does not retry)', async () => {
    const { svc } = build([]);
    const send = mockSend(svc, 200);
    const r = await svc.deliverOnce({ url: 'http://169.254.169.254/latest' }, 'x', {});
    expect(r).toMatchObject({ ok: false, retry: false });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('WebhookDispatcher.send', () => {
  afterEach(() => {
    delete process.env.WEBHOOK_ALLOW_PRIVATE;
  });
  const post = (url: string) => build([]).svc.send(url, { 'Content-Type': 'application/json' }, '{}');

  it('refuses internal IP literals', async () => {
    await expect(post('http://127.0.0.1:9/hook')).rejects.toMatchObject({ code: BLOCKED_ADDRESS });
  });

  it('refuses a name that resolves to an internal address, using the answer it would connect to', async () => {
    // localhost is resolved by the connect-time lookup, which is what stops DNS rebinding.
    await expect(post('http://localhost:9/hook')).rejects.toMatchObject({ code: BLOCKED_ADDRESS });
  });

  it('delivers to a local server and does not follow redirects when allowed', async () => {
    process.env.WEBHOOK_ALLOW_PRIVATE = 'true';
    const seen: string[] = [];
    const server = createServer((req, res) => {
      seen.push(req.url ?? '');
      res.statusCode = req.url === '/redir' ? 302 : 204;
      res.setHeader('Location', '/ok');
      res.end();
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const { port } = server.address() as AddressInfo;
    try {
      await expect(post(`http://127.0.0.1:${port}/ok`)).resolves.toBe(204);
      await expect(post(`http://127.0.0.1:${port}/redir`)).resolves.toBe(302);
      expect(seen).toEqual(['/ok', '/redir']);
    } finally {
      server.close();
    }
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
