import { randomBytes } from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PluginService } from '../plugin.service';
import { PluginRegistry } from '../plugin-registry.service';
import type { PluginDefinition } from '../plugin.types';
import { asMock } from '../../../common/__tests__/test-utils';
import { isEncrypted, resetSecretBoxForTests, secretBox } from '../../../common/secret-box';
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

function definition(over: Partial<PluginDefinition> = {}): PluginDefinition {
  return {
    key: 'demo-channel',
    name: 'Demo channel',
    description: 'For tests',
    adminFields: [
      { key: 'apiToken', kind: 'secret', required: true },
      { key: 'region', kind: 'select', options: ['eu', 'us'], default: 'eu' },
    ],
    userFields: [
      { key: 'address', kind: 'secret', required: true },
      { key: 'label', kind: 'text', maxLength: 10 },
    ],
    validateAdmin: jest.fn(),
    validateUser: jest.fn(),
    channel: { send: jest.fn() },
    ...over,
  };
}

function build(def = definition()) {
  const registry = new PluginRegistry();
  registry.register(def);
  const plugins = fakeRepo<{
    id: number;
    key: string;
    name?: string;
    enabled: boolean;
    config?: Record<string, string> | null;
  }>();
  const settings = fakeRepo<{
    id: number;
    userId: number;
    pluginKey: string;
    enabled: boolean;
    types: string;
    settings?: string | null;
  }>();
  const svc = new PluginService(asMock(plugins), asMock(settings), registry);
  return { svc, plugins, settings, def };
}

async function enabled(build_ = build()) {
  await build_.svc.sync();
  await build_.svc.adminUpdate('demo-channel', { enabled: true, config: { apiToken: 'admin-secret' } });
  return build_;
}

describe('PluginRegistry', () => {
  it('rejects bad keys, a plugin registered twice and duplicate fields', () => {
    const r = new PluginRegistry();
    expect(() => r.register(definition({ key: 'Bad Key' }))).toThrow(/Invalid plugin key/);
    r.register(definition());
    expect(() => r.register(definition())).toThrow(/twice/);
    expect(() =>
      new PluginRegistry().register(
        definition({
          userFields: [
            { key: 'a', kind: 'text' },
            { key: 'a', kind: 'text' },
          ],
        }),
      ),
    ).toThrow(/twice/);
  });
});

describe('PluginService (admin)', () => {
  it('creates one row per registered plugin, switched off, and keeps the English texts current', async () => {
    const { svc, plugins } = build();
    await svc.sync();
    await svc.sync();
    expect(plugins.rows).toHaveLength(1);
    expect(plugins.rows[0]).toMatchObject({ key: 'demo-channel', enabled: false, name: 'Demo channel' });
    plugins.rows[0].name = 'Old';
    await svc.sync();
    expect(plugins.rows[0].name).toBe('Demo channel');
  });

  it('stores secret fields encrypted and never returns them, only whether they are set', async () => {
    const { svc, plugins } = await enabled();
    const stored = plugins.rows[0].config as Record<string, string>;
    expect(isEncrypted(stored.apiToken)).toBe(true);
    expect(secretBox().decrypt(stored.apiToken, 'plugin.demo-channel.apiToken')).toBe('admin-secret');
    const [view] = await svc.adminList();
    expect(JSON.stringify(view)).not.toContain('admin-secret');
    expect(view.fields.find((f) => f.key === 'apiToken')).toMatchObject({ value: null, isSet: true });
    expect(view.fields.find((f) => f.key === 'region')).toMatchObject({ value: 'eu' }); // the default
  });

  it('keeps a secret when it is not sent, replaces it when a new one is typed, clears it with null', async () => {
    const { svc, plugins } = await enabled();
    await svc.adminUpdate('demo-channel', { config: { region: 'us' } });
    expect(await svc.enabledConfig('demo-channel')).toEqual({ apiToken: 'admin-secret', region: 'us' });
    await svc.adminUpdate('demo-channel', { config: { apiToken: 'rotated' } });
    expect((await svc.enabledConfig('demo-channel'))?.apiToken).toBe('rotated');
    await expect(svc.adminUpdate('demo-channel', { config: { apiToken: null } })).rejects.toThrow(/apiToken/); // required while on
    await svc.adminUpdate('demo-channel', { enabled: false, config: { apiToken: null } });
    expect(plugins.rows[0].config).toEqual({ region: 'us' });
  });

  it('refuses to switch on with required fields missing, unknown fields and values outside a select', async () => {
    const { svc } = build();
    await svc.sync();
    await expect(svc.adminUpdate('demo-channel', { enabled: true })).rejects.toThrow(/apiToken/);
    await expect(svc.adminUpdate('demo-channel', { config: { nope: 'x' } })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(svc.adminUpdate('demo-channel', { config: { region: 'mars' } })).rejects.toThrow(/unknown value/);
    await expect(svc.adminUpdate('unknown', { enabled: true })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cannot be switched on in the demo', async () => {
    const { svc } = build();
    await svc.sync();
    process.env.DEMO_MODE = 'true';
    try {
      await expect(svc.adminUpdate('demo-channel', { enabled: true, config: { apiToken: 'x' } })).rejects.toThrow(
        /demo/,
      );
    } finally {
      delete process.env.DEMO_MODE;
    }
  });

  it('lets the plugin check new admin settings', async () => {
    const { svc, def } = await enabled();
    expect(def.validateAdmin).toHaveBeenCalledWith({ apiToken: 'admin-secret' });
  });
});

describe('PluginService (per user)', () => {
  it('offers nothing while the plugin is off', async () => {
    const { svc } = build();
    await svc.sync();
    expect(await svc.userList(7)).toEqual([]);
    await expect(svc.userUpdate(7, 'demo-channel', { settings: { address: 'x' } })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(await svc.publicList()).toEqual([]);
  });

  it('stores the user secret encrypted, returns only that it is set, and defaults to every notification type', async () => {
    const b = await enabled();
    const view = await b.svc.userUpdate(7, 'demo-channel', { settings: { address: 'https://chat.example/hook' } });
    const stored = JSON.parse(b.settings.rows[0].settings as string) as Record<string, string>;
    expect(isEncrypted(stored.address)).toBe(true);
    expect(JSON.stringify(view)).not.toContain('chat.example');
    expect(view).toMatchObject({ enabled: true, configured: true, isChannel: true });
    expect(view.types).toHaveLength(6);
    expect(view.fields.find((f) => f.key === 'address')).toMatchObject({ isSet: true, value: null });
    expect(b.def.validateUser).toHaveBeenCalledWith({ address: 'https://chat.example/hook' }, expect.anything());
    expect(await b.svc.publicList()).toEqual([
      { key: 'demo-channel', name: 'Demo channel', description: 'For tests', isChannel: true },
    ]);
  });

  it('validates types and fields, and requires the address before it can be on', async () => {
    const b = await enabled();
    await expect(b.svc.userUpdate(7, 'demo-channel', { enabled: true })).rejects.toThrow(/address/);
    await expect(
      b.svc.userUpdate(7, 'demo-channel', { settings: { address: 'x' }, types: ['task_assigned', 'spam'] }),
    ).rejects.toThrow(/spam/);
    await expect(
      b.svc.userUpdate(7, 'demo-channel', { settings: { address: 'x', label: 'x'.repeat(11) } }),
    ).rejects.toThrow(/too long/);
    const v = await b.svc.userUpdate(7, 'demo-channel', {
      settings: { address: 'x' },
      types: ['task_reminder', 'task_assigned', 'task_reminder'],
    });
    expect(v.types).toEqual(['task_assigned', 'task_reminder']);
    // Switching it off does not need the address any more.
    expect((await b.svc.userUpdate(7, 'demo-channel', { enabled: false, settings: { address: null } })).enabled).toBe(
      false,
    );
  });

  it("keeps users apart, and forgets a user's settings on remove", async () => {
    const b = await enabled();
    await b.svc.userUpdate(7, 'demo-channel', { settings: { address: 'seven' } });
    await b.svc.userUpdate(8, 'demo-channel', { settings: { address: 'eight' } });
    const [row7] = b.settings.rows.filter((r) => r.userId === 7);
    expect(b.svc.userValues(b.def, row7 as never)).toEqual({ address: 'seven' });
    expect((await b.svc.activeUserSettings([7, 9], ['demo-channel'])).map((r) => r.userId)).toEqual([7]);
    await b.svc.userRemove(7, 'demo-channel');
    expect(b.settings.rows.map((r) => r.userId)).toEqual([8]);
  });
});
