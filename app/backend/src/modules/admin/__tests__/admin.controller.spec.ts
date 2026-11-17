import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminController } from '../admin.controller';
import { UserRole } from '../../user/user-role.enum';

function build(setRoleResult: any = { id: 2, username: 'bob', role: 'admin', password: 'HASH' }) {
  const users: any = {
    findAllAdmin: jest.fn(async () => [{ id: 1 }]),
    setRole: jest.fn(async () => setRoleResult),
    setLocked: jest.fn(async (id: number, isLocked: boolean) =>
      id === 99 ? null : { id, isLocked, password: 'HASH' },
    ),
    findById: jest.fn(async (id: number) => (id === 99 ? null : { id })),
  };
  const accounts: any = { purgeUser: jest.fn(async () => undefined) };
  const sessions: any = { revokeAllForUser: jest.fn(async () => undefined) };
  return { ctrl: new AdminController(users, accounts, sessions), users, accounts, sessions };
}
const req = { user: { userId: 1 } };

describe('AdminController', () => {
  it('is restricted to admins', () => {
    expect(Reflect.getMetadata('roles', AdminController)).toEqual([UserRole.ADMIN]);
  });

  it('findAllUsers delegates to findAllAdmin', async () => {
    const { ctrl } = build();
    expect(await ctrl.findAllUsers()).toEqual([{ id: 1 }]);
  });

  it('updateRole sets the role (id coerced to number) and strips the password hash', async () => {
    const { ctrl, users } = build();
    const res: any = await ctrl.updateRole('2' as any, UserRole.ADMIN, req);
    expect(users.setRole).toHaveBeenCalledWith(2, UserRole.ADMIN);
    expect(res).toEqual({ id: 2, username: 'bob', role: 'admin' });
    expect(res.password).toBeUndefined();
  });

  it('rejects an invalid role without touching the DB', async () => {
    const { ctrl, users } = build();
    await expect(ctrl.updateRole(2, 'superuser' as any, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.setRole).not.toHaveBeenCalled();
  });

  it('forbids changing your own role (also with a string id)', async () => {
    const { ctrl, users } = build();
    await expect(ctrl.updateRole('1' as any, UserRole.USER, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.setRole).not.toHaveBeenCalled();
  });

  it('404 when the user does not exist', async () => {
    const { ctrl } = build(null);
    await expect(ctrl.updateRole(99, UserRole.USER, req)).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('lock / delete', () => {
    it('locks a user, revokes their sessions and strips the password', async () => {
      const { ctrl, sessions } = build();
      const res: any = await ctrl.setLocked('2' as any, true, req);
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
      await expect(ctrl.setLocked(2, 'yes' as any, req)).rejects.toThrow('locked must be a boolean');
      await expect(ctrl.setLocked('1' as any, true, req)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(ctrl.setLocked(99, true, req)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes a user through the account purge', async () => {
      const { ctrl, accounts } = build();
      await ctrl.removeUser('2' as any, req);
      expect(accounts.purgeUser).toHaveBeenCalledWith(2);
    });

    it('rejects deleting yourself or an unknown user', async () => {
      const { ctrl, accounts } = build();
      await expect(ctrl.removeUser(1, req)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(ctrl.removeUser(99, req)).rejects.toBeInstanceOf(NotFoundException);
      expect(accounts.purgeUser).not.toHaveBeenCalled();
    });
  });
});
