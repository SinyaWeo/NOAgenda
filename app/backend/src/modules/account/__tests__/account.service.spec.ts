import { resolve } from 'path';

jest.mock('fs', () => ({ ...jest.requireActual('fs'), existsSync: jest.fn(() => true), unlink: jest.fn() }));
import * as fs from 'fs';
import { ConflictException, type Logger } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { asMock } from '../../../common/__tests__/test-utils';
import { AccountService } from '../account.service';

const UPLOADS = resolve(process.cwd(), 'uploads');

type Row = Record<string, unknown>;
type Handler = (sql: string, params: unknown[]) => Row[] | undefined;
type Manager = { query: (sql: string, params?: unknown[]) => Promise<Row[]> };
type ExportShape = Record<string, unknown> & {
  profile: Row;
  ownedProjectsAndTasks: Row[];
  tasksCreatedInOtherProjects: Row[];
  savedFilters: { filters: unknown }[];
  note: string;
};

function build(handler: Handler = () => undefined) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const run = async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    return handler(sql, params) ?? [];
  };
  const manager = { query: jest.fn(run) };
  const ds = {
    query: jest.fn(run),
    transaction: jest.fn(async (fn: (m: Manager) => Promise<unknown>) => fn(manager)),
  };
  return { svc: new AccountService(asMock<DataSource>(ds)), ds, calls, manager };
}

describe('AccountService', () => {
  beforeEach(() => {
    (fs.unlink as unknown as jest.Mock).mockClear();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  describe('deletion request', () => {
    it('refuses while the user is the only manager of a team (one-person teams included)', async () => {
      const { svc, calls } = build((sql) =>
        sql.startsWith('SELECT t.name FROM teams') ? [{ name: 'Ops' }] : undefined,
      );
      await expect(svc.requestDeletion(5)).rejects.toBeInstanceOf(ConflictException);
      expect(calls.some((c) => c.sql.startsWith('UPDATE users'))).toBe(false);
    });

    it('schedules deletion after the grace period for that user only', async () => {
      const { svc, ds } = build();
      const before = Date.now();
      const { scheduledAt } = await svc.requestDeletion(5);
      const days = (scheduledAt.getTime() - before) / 86_400_000;
      expect(days).toBeGreaterThan(svc.graceDays - 0.01);
      expect(days).toBeLessThan(svc.graceDays + 0.01);
      const [sql, params] = ds.query.mock.calls.find(([q]) => /^UPDATE users SET isDeletionRequested = 1/.test(q))!;
      expect(sql).toMatch(/UPDATE users SET isDeletionRequested = 1/);
      expect(params).toEqual([scheduledAt, 5]);
    });

    it('cancelDeletion clears the flags for that user only', async () => {
      const { svc, ds } = build();
      await svc.cancelDeletion(5);
      expect(ds.query.mock.calls[0][0]).toMatch(/isDeletionRequested = 0, deletionScheduledAt = NULL WHERE id = \?/);
      expect(ds.query.mock.calls[0][1]).toEqual([5]);
    });
  });

  describe('purgeDue', () => {
    it('purges every due user, continuing past a failure, and counts successes', async () => {
      const { svc } = build((sql) => (sql.startsWith('SELECT id FROM users') ? [{ id: 1 }, { id: 2 }, { id: 3 }] : []));
      jest.spyOn((svc as unknown as { logger: Logger }).logger, 'error').mockImplementation();
      jest.spyOn((svc as unknown as { logger: Logger }).logger, 'log').mockImplementation();
      const spy = jest.spyOn(svc, 'purgeUser').mockImplementation(async (id) => {
        if (id === 2) throw new Error('fail');
      });
      expect(await svc.purgeDue()).toBe(2);
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('only selects accounts with a deletion request whose date has passed', async () => {
      const { svc, ds } = build();
      await svc.purgeDue();
      const [sql, params] = ds.query.mock.calls[0];
      expect(sql).toMatch(/isDeletionRequested = 1/);
      expect(sql).toMatch(/deletionScheduledAt <= \?/);
      expect(params?.[0]).toBeInstanceOf(Date);
    });
  });

  describe('purgeUser', () => {
    const handler: Handler = (sql) => {
      if (sql.startsWith('SELECT id, avatarUrl FROM users')) return [{ id: 9, avatarUrl: '/uploads/avatars/me.png' }];
      if (sql.includes("type = 'project'")) return [{ id: 100 }];
      if (sql.startsWith('SELECT id FROM nodes WHERE parentId')) return [{ id: 101 }];
      if (sql.startsWith('SELECT path FROM attachments WHERE nodeId'))
        return [{ path: `${UPLOADS}/a.txt` }, { path: '/etc/passwd' }];
      if (sql.startsWith('SELECT path FROM attachments WHERE uploaderId')) return [{ path: `${UPLOADS}/b.txt` }];
      return undefined;
    };

    it('runs in one transaction, scopes deletes to the user and deletes the user row last', async () => {
      const { svc, ds, calls } = build(handler);
      await svc.purgeUser(9);
      expect(ds.transaction).toHaveBeenCalledTimes(1);
      const last = calls[calls.length - 1];
      expect(last.sql).toBe('DELETE FROM users WHERE id = ?');
      expect(last.params).toEqual([9]);
      const nodeDelete = calls.find((c) => c.sql.startsWith('DELETE FROM nodes'))!;
      expect(nodeDelete.params.sort()).toEqual([100, 101]);
      expect(calls.some((c) => c.sql === 'DELETE FROM comments WHERE authorId = ?' && c.params[0] === 9)).toBe(true);
      expect(calls.some((c) => c.sql === 'UPDATE nodes SET createdBy = NULL WHERE createdBy = ?')).toBe(true);
      expect(calls.some((c) => c.sql.startsWith('DELETE FROM api_tokens WHERE userId'))).toBe(true);
      expect(calls.some((c) => c.sql.startsWith('DELETE FROM user_sessions WHERE userId'))).toBe(true);
      // teams survive the user; only their memberships are removed
      expect(calls.some((c) => c.sql.startsWith('DELETE FROM teams'))).toBe(false);
      expect(calls.some((c) => c.sql === 'DELETE FROM team_members WHERE userId = ?' && c.params[0] === 9)).toBe(true);
    });

    it('is refused, deleting nothing, when the user is the last manager of a team', async () => {
      const { svc, calls } = build((sql, params) => {
        if (sql.startsWith('SELECT t.name FROM teams')) return [{ name: 'Ops' }, { name: 'Sales' }];
        return handler(sql, params);
      });
      await expect(svc.purgeUser(9)).rejects.toThrow(/only manager of: Ops, Sales\. Delete the team/);
      expect(calls.some((c) => c.sql.startsWith('DELETE'))).toBe(false);
    });

    it('unlinks files after commit, only from inside uploads/ (avatar included)', async () => {
      const { svc } = build(handler);
      await svc.purgeUser(9);
      const removed = (fs.unlink as unknown as jest.Mock).mock.calls.map((c) => c[0]).sort();
      expect(removed).toEqual([`${UPLOADS}/a.txt`, `${UPLOADS}/avatars/me.png`, `${UPLOADS}/b.txt`].sort());
      expect(removed).not.toContain('/etc/passwd');
    });

    it('does not delete files when the transaction fails', async () => {
      const { svc, ds } = build(handler);
      ds.transaction.mockImplementation(async (fn: (m: Manager) => Promise<unknown>) => {
        await fn({ query: async (sql: string) => handler(sql, []) ?? [] });
        throw new Error('commit failed');
      });
      await expect(svc.purgeUser(9)).rejects.toThrow('commit failed');
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('is a no-op for an unknown user', async () => {
      const { svc, calls } = build(() => []);
      await svc.purgeUser(404);
      expect(calls).toHaveLength(1);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('chunks large descendant lists (500 per statement)', async () => {
      const roots = Array.from({ length: 1200 }, (_, i) => ({ id: i + 1 }));
      const { svc, calls } = build((sql) => {
        if (sql.startsWith('SELECT id, avatarUrl')) return [{ id: 9 }];
        if (sql.includes("type = 'project'")) return roots;
        return undefined;
      });
      await svc.purgeUser(9);
      const dels = calls.filter((c) => c.sql.startsWith('DELETE FROM nodes'));
      expect(dels.map((c) => c.params.length)).toEqual([500, 500, 200]);
    });
  });

  describe('exportData', () => {
    it('exports the user data scoped by id, parses filters JSON and omits secrets', async () => {
      const { svc, calls } = build((sql) => {
        if (sql.includes('FROM users WHERE id')) return [{ id: 3, username: 'ann' }];
        if (sql.includes("type = 'project'")) return [{ id: 10 }];
        if (sql.startsWith('SELECT * FROM nodes WHERE id IN')) return [{ id: 10 }];
        if (sql.startsWith('SELECT * FROM nodes WHERE createdBy')) return [{ id: 10 }, { id: 77 }];
        if (sql.includes('FROM saved_filters'))
          return [
            { id: 1, filters: '{"a":1}' },
            { id: 2, filters: 'not json' },
          ];
        return undefined;
      });
      const out = (await svc.exportData(3)) as ExportShape;
      expect(out.format).toBe('noagenda-export-v1');
      expect(out.profile).toEqual({ id: 3, username: 'ann' });
      expect(out.ownedProjectsAndTasks).toEqual([{ id: 10 }]);
      expect(out.tasksCreatedInOtherProjects).toEqual([{ id: 77 }]);
      expect(out.savedFilters[0].filters).toEqual({ a: 1 });
      expect(out.savedFilters[1].filters).toBe('not json');
      const sqls = calls.map((c) => c.sql).join('\n');
      expect(sqls).not.toMatch(/password/i);
      expect(sqls).not.toMatch(/\btoken\b|tokenHash|secret/);
      expect(calls.find((c) => c.sql.includes('FROM api_tokens'))!.params).toEqual([3]);
      expect(out.note).toMatch(/not exported/);
      for (const k of ['apiTokens', 'sessions', 'webhooks', 'notifications', 'comments']) expect(out[k]).toEqual([]);
    });

    it('every query is parameterised with the user id or node ids', async () => {
      const { svc, calls } = build();
      await svc.exportData(3);
      for (const c of calls) expect(c.params.length).toBeGreaterThan(0);
    });
  });
});
