jest.mock('fs', () => ({ ...jest.requireActual('fs'), existsSync: jest.fn(() => true), unlink: jest.fn() }));
import * as fs from 'fs';
import { resolve } from 'path';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { asMock } from '../../../common/__tests__/test-utils';
import type { AppSettingsService } from '../../app-settings/app-settings.service';
import { SingleUserService } from '../single-user.service';

type Row = Record<string, unknown>;
type Handler = (sql: string, params: unknown[]) => Row[] | undefined;
const ADMIN = { id: 1, username: 'alice', role: 'admin', isLocked: 0 };
const ACTOR = { id: 1, username: 'alice' };

function build(handler: Handler = () => undefined, settings: Record<string, string> = {}) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const run = async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT id, username, role, isLocked FROM users')) return params[0] === 1 ? [ADMIN] : [];
    return handler(sql, params) ?? [];
  };
  const manager = { query: jest.fn(run) };
  const ds = {
    query: jest.fn(run),
    transaction: jest.fn(async (...args: unknown[]) =>
      (args[args.length - 1] as (m: typeof manager) => Promise<unknown>)(manager),
    ),
  };
  const appSettings = {
    get: jest.fn(async (k: string) => settings[k] ?? null),
    clearModeCache: jest.fn(),
  };
  const svc = new SingleUserService(asMock<DataSource>(ds), asMock<AppSettingsService>(appSettings));
  return { svc, calls, ds, appSettings };
}

const idx = (calls: { sql: string }[], pred: (s: string) => boolean) => calls.findIndex((c) => pred(c.sql));

describe('SingleUserService.enable', () => {
  beforeEach(() => (fs.unlink as unknown as jest.Mock).mockClear());

  it('does everything in one transaction, in a safe order, and sets the flag last', async () => {
    const { svc, calls, ds, appSettings } = build((sql) =>
      sql.startsWith('SELECT COUNT(*) AS n FROM users') ? [{ n: 2 }] : undefined,
    );
    await svc.enable({ userId: 1, confirmUsername: 'alice' }, ACTOR);
    expect(ds.transaction).toHaveBeenCalledTimes(1);
    expect(ds.transaction.mock.calls[0][0]).toBe('READ COMMITTED');
    const at = (s: string) => idx(calls, (sql) => sql.startsWith(s));
    // the other accounts are held before anything changes
    expect(calls[at('SELECT id FROM users WHERE id <> ? FOR UPDATE')].params).toEqual([1]);
    expect(at('SELECT id FROM users WHERE id <> ? FOR UPDATE')).toBeLessThan(at('DELETE FROM idea_teams'));
    // the flag row is locked before anything changes
    expect(at("SELECT value FROM app_settings WHERE `key` = 'singleUserMode' FOR UPDATE")).toBeLessThan(
      at('DELETE FROM teams'),
    );
    // sharing goes before the users; content moves before the users go
    for (const t of ['idea_teams', 'project_teams', 'project_users', 'team_members', 'teams']) {
      expect(at(`DELETE FROM ${t}`)).toBeGreaterThan(-1);
      expect(at(`DELETE FROM ${t}`)).toBeLessThan(at('DELETE FROM users'));
    }
    for (const s of [
      'UPDATE IGNORE task_assignees SET userId = ?',
      'DELETE FROM task_assignees WHERE userId <> ?',
      'UPDATE nodes SET createdBy = ?',
      'UPDATE nodes SET ownerId = ?',
      'UPDATE comments SET authorId = ?',
      'UPDATE attachments SET uploaderId = ?',
      'UPDATE notes SET userId = ?',
      'UPDATE activities SET ownerId = ?',
      'DELETE FROM notifications WHERE userId <> ?',
      'DELETE FROM webhook',
    ]) {
      expect(at(s)).toBeGreaterThan(-1);
      expect(at(s)).toBeLessThan(at('DELETE FROM users'));
    }
    expect(calls[at('DELETE FROM users')].params).toEqual([1]);
    const flag = calls.filter((c) => c.sql.startsWith('INSERT INTO app_settings'));
    expect(flag.map((c) => c.params[0])).toEqual(['singleUserMode', 'singleUserId', 'singleUserSwitchedAt']);
    expect(flag[0].params[1]).toBe('true');
    expect(idx(calls, (s) => s.startsWith('INSERT INTO app_settings'))).toBeGreaterThan(at('DELETE FROM users'));
    expect(appSettings.clearModeCache).toHaveBeenCalled();
  });

  it('merges same-named labels into the sole user one and takes the others over', async () => {
    const { svc, calls } = build((sql, params) => {
      if (sql.startsWith('SELECT id, title FROM labels'))
        return [
          { id: 20, title: 'Urgent' },
          { id: 21, title: 'Home' },
        ];
      if (sql.startsWith('SELECT id FROM labels WHERE createdBy = ? AND title = ?'))
        return params[1] === 'Urgent' ? [{ id: 10 }] : [];
      return undefined;
    });
    await svc.enable({ userId: 1, confirmUsername: 'alice' }, ACTOR);
    expect(calls.find((c) => c.sql.startsWith('UPDATE IGNORE task_labels'))?.params).toEqual([10, 20]);
    expect(calls.find((c) => c.sql === 'DELETE FROM labels WHERE id = ?')?.params).toEqual([20]);
    expect(calls.find((c) => c.sql.startsWith('UPDATE labels SET createdBy'))?.params).toEqual([1, 21]);
  });

  it('removes the other users avatars after the commit, only inside uploads/', async () => {
    const { svc } = build((sql) =>
      sql.startsWith('SELECT avatarUrl FROM users') ? [{ avatarUrl: '/uploads/avatars/bob.png' }] : undefined,
    );
    await svc.enable({ userId: 1, confirmUsername: 'alice' }, ACTOR);
    const removed = (fs.unlink as unknown as jest.Mock).mock.calls.map((c) => c[0]);
    expect(removed).toEqual([resolve(process.cwd(), 'uploads', 'avatars', 'bob.png')]);
  });

  it('refuses when already on, changing nothing', async () => {
    const { svc, calls } = build((sql) => (sql.includes('FOR UPDATE') ? [{ value: 'true' }] : undefined));
    await expect(svc.enable({ userId: 1, confirmUsername: 'alice' }, ACTOR)).rejects.toBeInstanceOf(ConflictException);
    expect(calls.some((c) => /^(DELETE|UPDATE)/.test(c.sql))).toBe(false);
  });

  it('refuses a wrong username, an unknown user and a non-admin or locked target', async () => {
    const wrong = build();
    await expect(wrong.svc.enable({ userId: 1, confirmUsername: 'Alice' }, ACTOR)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(wrong.calls.some((c) => /^(DELETE|UPDATE)/.test(c.sql))).toBe(false);
    await expect(build().svc.enable({ userId: 2, confirmUsername: 'bob' }, ACTOR)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    for (const user of [
      { ...ADMIN, role: 'user' },
      { ...ADMIN, isLocked: 1 },
    ]) {
      const { svc } = build((sql) => (sql.startsWith('SELECT id, username, role') ? [user] : undefined));
      const s = svc as unknown as { target: (q: unknown, id: number) => Promise<unknown> };
      await expect(s.target(async () => [user], 1)).rejects.toThrow('The sole user must be an active admin');
    }
  });
});

describe('SingleUserService.disable / status', () => {
  it('only clears the flag', async () => {
    const { svc, calls, appSettings } = build((sql) => (sql.includes('FOR UPDATE') ? [{ value: 'true' }] : undefined));
    await svc.disable(ACTOR);
    const writes = calls.filter((c) => /^(DELETE|UPDATE|INSERT)/.test(c.sql)).map((c) => c.sql);
    expect(writes).toEqual([
      "DELETE FROM app_settings WHERE `key` IN ('singleUserMode', 'singleUserId', 'singleUserSwitchedAt')",
    ]);
    expect(appSettings.clearModeCache).toHaveBeenCalled();
  });

  it('refuses when the mode is not on', async () => {
    await expect(build().svc.disable(ACTOR)).rejects.toBeInstanceOf(ConflictException);
  });

  it('reports the flag, the sole user and when', async () => {
    const on = build(undefined, { singleUserMode: 'true', singleUserId: '1', singleUserSwitchedAt: '2026-11-24' });
    expect(await on.svc.status()).toEqual({ enabled: true, userId: 1, switchedAt: '2026-11-24' });
    expect(await build().svc.status()).toEqual({ enabled: false, userId: null, switchedAt: null });
  });
});

describe('SingleUserService.preview', () => {
  it('counts what would change and plans the label merge case-insensitively', async () => {
    const { svc } = build((sql) => {
      if (sql.startsWith('SELECT type, COUNT(*)'))
        return [
          { type: 'project', n: '2' },
          { type: 'task', n: '5' },
        ];
      if (sql.startsWith('SELECT COUNT(*) AS n, COALESCE(SUM(size)')) return [{ n: '3', bytes: '1024' }];
      if (sql.startsWith('SELECT createdBy, title FROM labels'))
        return [
          { createdBy: 1, title: 'Urgent' },
          { createdBy: 2, title: 'urgent' },
          { createdBy: 2, title: 'Home' },
          { createdBy: 3, title: 'Home' },
        ];
      if (sql.startsWith('SELECT id, url FROM webhook')) return [{ id: 4, url: 'https://hook' }];
      if (sql.includes('COUNT(*)')) return [{ n: 1 }];
      return undefined;
    });
    const p = await svc.preview(1);
    expect(p.target).toEqual({ id: 1, username: 'alice' });
    expect(p.nodes).toEqual({ project: 2, task: 5, idea: 0 });
    expect(p.attachments).toEqual({ count: 3, bytes: 1024 });
    expect(p.labels).toEqual({ moved: 1, merged: 2 });
    expect(p.webhooks).toEqual([{ id: 4, url: 'https://hook' }]);
  });
});
