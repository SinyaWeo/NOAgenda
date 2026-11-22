import { ActivityService } from '../../activity/activity.service';
import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminController } from '../admin.controller';
import { UserRole } from '../../user/user-role.enum';
import type { UserService } from '../../user/user.service';
import type { AccountService } from '../../account/account.service';
import type { SessionService } from '../../session/session.service';
import type { TeamService } from '../../team/team.service';
import type { TeamMemberService } from '../../team-member/team-member.service';
import { TeamRole } from '../../team-member/team-member.entity';
import { asMock, authReq, invalid } from '../../../common/__tests__/test-utils';

function build(setRoleResult: unknown = { id: 2, username: 'bob', role: 'admin', password: 'HASH' }) {
  const users = {
    findAllAdmin: jest.fn(async () => [{ id: 1 }]),
    setRole: jest.fn(async () => setRoleResult),
    setLocked: jest.fn(async (id: number, isLocked: boolean) =>
      id === 99 ? null : { id, isLocked, password: 'HASH' },
    ),
    findById: jest.fn(async (id: number) => (id === 99 ? null : { id })),
  };
  const accounts = { purgeUser: jest.fn(async () => undefined) };
  const sessions = { revokeAllForUser: jest.fn(async () => undefined) };
  const teams = { findAllWithMembers: jest.fn(async () => [{ id: 7, members: [] }]) };
  const teamMembers = { setRole: jest.fn(async (_t: number, id: number, role: TeamRole) => ({ id, role })) };
  const activity = { admin: jest.fn(async () => ({ items: [], next: null })) };
  return {
    activity,
    ctrl: new AdminController(
      asMock<UserService>(users),
      asMock<AccountService>(accounts),
      asMock<SessionService>(sessions),
      asMock<TeamService>(teams),
      asMock<TeamMemberService>(teamMembers),
      asMock<ActivityService>(activity),
    ),
    users,
    accounts,
    sessions,
    teams,
    teamMembers,
  };
}
const req = authReq(1);

describe('AdminController', () => {
  it('is restricted to admins', () => {
    expect(Reflect.getMetadata('roles', AdminController)).toEqual([UserRole.ADMIN]);
  });

  it('activityLog passes the filters, the cursor and the page size to the audit trail', async () => {
    const { ctrl, activity } = build();
    await ctrl.activityLog({ actorId: 3, action: 'task.deleted', before: 40, limit: 20 });
    expect(activity.admin).toHaveBeenCalledWith({ actorId: 3, action: 'task.deleted' }, 40, 20);
  });

  it('findAllUsers delegates to findAllAdmin', async () => {
    const { ctrl } = build();
    expect(await ctrl.findAllUsers()).toEqual([{ id: 1 }]);
  });

  it('updateRole sets the role (id coerced to number) and strips the password hash', async () => {
    const { ctrl, users } = build();
    const res = await ctrl.updateRole(invalid<number>('2'), UserRole.ADMIN, req);
    expect(users.setRole).toHaveBeenCalledWith(2, UserRole.ADMIN);
    expect(res).toEqual({ id: 2, username: 'bob', role: 'admin' });
    expect((res as { password?: string }).password).toBeUndefined();
  });

  it('rejects an invalid role without touching the DB', async () => {
    const { ctrl, users } = build();
    await expect(ctrl.updateRole(2, invalid<UserRole>('superuser'), req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.setRole).not.toHaveBeenCalled();
  });

  it('forbids changing your own role (also with a string id)', async () => {
    const { ctrl, users } = build();
    await expect(ctrl.updateRole(invalid<number>('1'), UserRole.USER, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.setRole).not.toHaveBeenCalled();
  });

  it('404 when the user does not exist', async () => {
    const { ctrl } = build(null);
    await expect(ctrl.updateRole(99, UserRole.USER, req)).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('lock / delete', () => {
    it('locks a user, revokes their sessions and strips the password', async () => {
      const { ctrl, sessions } = build();
      const res = await ctrl.setLocked(invalid<number>('2'), true, req);
      expect(res).toEqual({ id: 2, isLocked: true });
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith(2);
    });

    it('unlocking does not revoke sessions', async () => {
      const { ctrl, sessions } = build();
      await ctrl.setLocked(2, false, req);
      expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('rejects a non-boolean, self-lock and unknown user', async () => {
      const { ctrl } = build();
      await expect(ctrl.setLocked(2, invalid<boolean>('yes'), req)).rejects.toThrow('locked must be a boolean');
      await expect(ctrl.setLocked(invalid<number>('1'), true, req)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(ctrl.setLocked(99, true, req)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes a user through the account purge', async () => {
      const { ctrl, accounts } = build();
      await ctrl.removeUser(invalid<number>('2'), req);
      expect(accounts.purgeUser).toHaveBeenCalledWith(2);
    });

    it('rejects deleting yourself or an unknown user', async () => {
      const { ctrl, accounts } = build();
      await expect(ctrl.removeUser(1, req)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(ctrl.removeUser(99, req)).rejects.toBeInstanceOf(NotFoundException);
      expect(accounts.purgeUser).not.toHaveBeenCalled();
    });
  });

  it('lists every team with its members', async () => {
    const { ctrl } = build();
    expect(await ctrl.findAllTeams()).toEqual([{ id: 7, members: [] }]);
  });

  it('setTeamMemberRole coerces ids and returns the new role', async () => {
    const { ctrl, teamMembers } = build();
    const res = await ctrl.setTeamMemberRole(invalid<number>('7'), invalid<number>('3'), { role: TeamRole.MANAGER });
    expect(teamMembers.setRole).toHaveBeenCalledWith(7, 3, TeamRole.MANAGER);
    expect(res).toEqual({ id: 3, role: TeamRole.MANAGER });
  });
});
