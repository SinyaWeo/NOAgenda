import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminController } from '../admin.controller';
import { UserRole } from '../../user/user-role.enum';

function build(setRoleResult: any = { id: 2, username: 'bob', role: 'admin', password: 'HASH' }) {
  const users: any = {
    findAllAdmin: jest.fn(async () => [{ id: 1 }]),
    setRole: jest.fn(async () => setRoleResult),
  };
  return { ctrl: new AdminController(users), users };
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
});
