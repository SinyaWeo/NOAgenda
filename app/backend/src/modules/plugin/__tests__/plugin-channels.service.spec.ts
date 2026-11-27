import { randomBytes } from 'crypto';
import { PluginService } from '../plugin.service';
import { PluginRegistry } from '../plugin-registry.service';
import { PluginChannelService } from '../plugin-channels.service';
import { ChannelError, type PluginDefinition } from '../plugin.types';
import type { NotificationService, CreatedNotification } from '../../notification/notification.service';
import { asMock } from '../../../common/__tests__/test-utils';
import { resetSecretBoxForTests } from '../../../common/secret-box';
import { fakeRepo } from './fake-repo';

const env = { ...process.env };
beforeAll(() => {
  process.env.SECRETS_KEY = randomBytes(32).toString('base64');
  resetSecretBoxForTests();
});
afterAll(() => {
  process.env = env;
  resetSecretBoxForTests();
});

const flush = () => new Promise((r) => setImmediate(r));

async function build() {
  const send = jest.fn(async () => undefined);
  const def: PluginDefinition = {
    key: 'demo-channel',
    name: 'Demo',
    description: '',
    adminFields: [],
    userFields: [{ key: 'address', kind: 'secret', required: true }],
    channel: { send },
  };
  const registry = new PluginRegistry();
  registry.register(def);
  const settings = fakeRepo<{ id: number; userId: number; pluginKey: string; enabled: boolean; types: string }>();
  const plugins = new PluginService(asMock(fakeRepo()), asMock(settings), registry);
  await plugins.sync();
  await plugins.adminUpdate('demo-channel', { enabled: true });
  let listener: (c: CreatedNotification[]) => void = () => undefined;
  const notifications = { onCreated: jest.fn((l: typeof listener) => (listener = l)) };
  const mail = { appName: jest.fn(async () => 'Acme'), link: jest.fn((p: string) => `https://app${p}`) };
  const translator = { t: jest.fn((lang: string | null, key: string) => `${lang ?? 'en'}:${key}`) };
  const svc = new PluginChannelService(
    asMock<NotificationService>(notifications),
    plugins,
    registry,
    asMock(mail),
    asMock(translator),
  );
  svc.onModuleInit();
  return { svc, plugins, settings, send, emit: (c: CreatedNotification[]) => listener(c) };
}

const note = (over: Partial<CreatedNotification> = {}): CreatedNotification => ({
  id: 1,
  userId: 7,
  type: 'task_assigned',
  message: 'Ann assigned you to "Docs"',
  language: 'cs',
  nodeId: 42,
  kind: 'task',
  ...over,
});

describe('PluginChannelService', () => {
  it('forwards a new notification to the users who switched the channel on for that type', async () => {
    const b = await build();
    await b.plugins.userUpdate(7, 'demo-channel', { settings: { address: 'seven' }, types: ['task_assigned'] });
    await b.plugins.userUpdate(8, 'demo-channel', { settings: { address: 'eight' }, types: ['task_comment'] });
    await b.plugins.userUpdate(9, 'demo-channel', { enabled: false, settings: { address: 'nine' } });
    b.emit([note(), note({ id: 2, userId: 8 }), note({ id: 3, userId: 9 }), note({ id: 4, userId: 10 })]);
    await flush();
    await flush();
    expect(b.send).toHaveBeenCalledTimes(1);
    expect(b.send).toHaveBeenCalledWith(
      {
        userId: 7,
        type: 'task_assigned',
        text: 'Ann assigned you to "Docs"',
        link: 'https://app/tasks/42',
        linkLabel: 'cs:notification.open',
      },
      { address: 'seven' },
      {},
    );
    expect(b.settings.rows.find((r) => r.userId === 7)).toMatchObject({ lastError: null });
  });

  it('sends nothing once the admin switches the plugin off', async () => {
    const b = await build();
    await b.plugins.userUpdate(7, 'demo-channel', { settings: { address: 'seven' } });
    await b.plugins.adminUpdate('demo-channel', { enabled: false });
    b.emit([note()]);
    await flush();
    expect(b.send).not.toHaveBeenCalled();
  });

  it('retries a retryable failure later and records the final error for the user', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    try {
      const b = await build();
      await b.plugins.userUpdate(7, 'demo-channel', { settings: { address: 'seven' } });
      b.send.mockRejectedValue(new ChannelError('HTTP 503', true));
      b.emit([note()]);
      for (let i = 0; i < 6; i++) await flush();
      expect(b.send).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(2000);
      for (let i = 0; i < 6; i++) await flush();
      await jest.advanceTimersByTimeAsync(10000);
      for (let i = 0; i < 6; i++) await flush();
      expect(b.send).toHaveBeenCalledTimes(3);
      expect(b.settings.rows[0]).toMatchObject({ lastError: 'HTTP 503' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not retry a permanent failure', async () => {
    const b = await build();
    await b.plugins.userUpdate(7, 'demo-channel', { settings: { address: 'seven' } });
    b.send.mockRejectedValue(new ChannelError('HTTP 404', false));
    b.emit([note()]);
    for (let i = 0; i < 6; i++) await flush();
    expect(b.send).toHaveBeenCalledTimes(1);
    expect(b.settings.rows[0]).toMatchObject({ lastError: 'HTTP 404' });
  });

  it("a test message is sent now, in the user's language, and its outcome returned", async () => {
    const b = await build();
    await b.plugins.userUpdate(7, 'demo-channel', { settings: { address: 'seven' } });
    expect(await b.svc.test(7, 'demo-channel', 'cs')).toEqual({ ok: true, error: null });
    expect(b.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: null, text: 'cs:notification.channel_test', link: 'https://app/' }),
      { address: 'seven' },
      {},
    );
    b.send.mockRejectedValueOnce(new Error('boom'));
    expect(await b.svc.test(7, 'demo-channel', 'en')).toEqual({ ok: false, error: 'boom' });
    await expect(b.svc.test(8, 'demo-channel', 'en')).rejects.toThrow(/Save your settings/);
  });
});
