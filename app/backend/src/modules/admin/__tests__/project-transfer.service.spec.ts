import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { asMock } from '../../../common/__tests__/test-utils';
import type { DomainEvents } from '../../../common/domain-events';
import type { NotificationService } from '../../notification/notification.service';
import type { UserService } from '../../user/user.service';
import { ProjectTransferService } from '../project-transfer.service';

type Row = Record<string, unknown>;
const USERS: Record<number, { id: number; username: string; isLocked: boolean }> = {
  1: { id: 1, username: 'alice', isLocked: false },
  2: { id: 2, username: 'bob', isLocked: false },
  3: { id: 3, username: 'carol', isLocked: false },
  7: { id: 7, username: 'locked', isLocked: true },
};

function build(project: Row | null = { id: 5, name: 'Home', ownerId: 2 }) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const manager = {
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return sql.includes('FOR UPDATE') && project ? [project] : [];
    }),
  };
  const ds = { transaction: jest.fn(async (fn: (m: typeof manager) => Promise<unknown>) => fn(manager)) };
  const events = { emit: jest.fn() };
  const notifications = { notify: jest.fn(async () => undefined) };
  const users = { findById: jest.fn(async (id: number) => USERS[id] ?? null) };
  const svc = new ProjectTransferService(
    asMock<DataSource>(ds),
    asMock<DomainEvents>(events),
    asMock<NotificationService>(notifications),
    asMock<UserService>(users),
  );
  return { svc, calls, events, notifications, ds };
}
const ALICE = { id: 1, username: 'alice' };

describe('ProjectTransferService.announce', () => {
  it('records an audit-only owner change and notifies the new owner, per project', async () => {
    const { svc, events, notifications } = build();
    await svc.announce(
      [
        { id: 5, name: 'Home' },
        { id: 6, name: null },
      ],
      { fromName: 'bob', to: { id: 3, username: 'carol' }, actorId: 1, actorName: 'alice' },
    );
    expect(events.emit).toHaveBeenCalledTimes(2);
    expect(events.emit).toHaveBeenCalledWith({
      name: 'project.owner_changed',
      data: { projectId: 5 },
      nodeId: 5,
      projectId: 5,
      owner: 3,
      actorId: 1,
      title: 'Home',
      changes: { owner: { from: 'bob', to: 'carol' } },
      auditOnly: true,
    });
    expect(notifications.notify).toHaveBeenCalledTimes(2); // no previous owner to tell (account deleted)
    expect(notifications.notify).toHaveBeenCalledWith({
      type: 'project_transferred',
      recipients: [3],
      actorId: 1,
      actorName: 'alice',
      nodeId: 6,
      kind: 'project',
      title: '',
    });
  });
});

describe('ProjectTransferService.transfer', () => {
  it('moves the project in one transaction, keeps the old owner as Manager and drops the new owner share', async () => {
    const { svc, calls, ds } = build();
    expect(await svc.transfer(5, 3, ALICE, 'Bob left')).toEqual({ id: 5, name: 'Home', ownerId: 3 });
    expect(ds.transaction).toHaveBeenCalledTimes(1);
    const sqls = calls.map((c) => c.sql);
    expect(calls.find((c) => c.sql.startsWith('UPDATE nodes SET ownerId'))?.params).toEqual([3, 5]);
    const grant = calls.find((c) => c.sql.startsWith('INSERT INTO project_users'));
    expect(grant?.sql).toMatch(/ON DUPLICATE KEY UPDATE permission = 'admin'/);
    expect(grant?.params).toEqual([5, 2]);
    expect(calls.find((c) => c.sql.startsWith('DELETE FROM project_users'))?.params).toEqual([5, 3]);
    expect(sqls.findIndex((s) => s.includes('FOR UPDATE'))).toBe(0);
  });

  it('records the reason and tells both the new and the previous owner', async () => {
    const { svc, events, notifications } = build();
    await svc.transfer(5, 1, ALICE, 'Bob left'); // take over
    expect(events.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'project.owner_changed',
        changes: { owner: { from: 'bob', to: 'alice' }, reason: 'Bob left' },
      }),
    );
    const types = notifications.notify.mock.calls.map((c) => {
      const [event] = c as unknown as [{ type: string; recipients: number[] }];
      return [event.type, event.recipients];
    });
    expect(types).toEqual([
      ['project_transferred', [1]],
      ['project_transferred_away', [2]],
    ]);
  });

  it('works for a project without an owner (no share, no previous owner to tell)', async () => {
    const { svc, calls, notifications } = build({ id: 5, name: 'Orphan', ownerId: null });
    await svc.transfer(5, 3, ALICE, 'Nobody owned it');
    expect(calls.some((c) => c.sql.startsWith('INSERT INTO project_users'))).toBe(false);
    expect(notifications.notify).toHaveBeenCalledTimes(1);
  });

  it('refuses an unknown or locked target, the current owner and an unknown project', async () => {
    const { svc, calls } = build();
    await expect(svc.transfer(5, 99, ALICE, 'why')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.transfer(5, 7, ALICE, 'why')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.transfer(5, 2, ALICE, 'why')).rejects.toThrow('That user already owns the project');
    expect(calls.some((c) => c.sql.startsWith('UPDATE'))).toBe(false);
    const missing = build(null);
    await expect(missing.svc.transfer(5, 3, ALICE, 'why')).rejects.toBeInstanceOf(NotFoundException);
  });
});
