import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { AppSettingsController } from '../app-settings.controller';
import { UserRole } from '../../user/user-role.enum';
import type { AppSettingsService } from '../app-settings.service';
import type { MfaService } from '../../mfa/mfa.service';
import type { AuthRequest } from '../../../common/auth-user';
import { asMock, invalid } from '../../../common/__tests__/test-utils';

const REQ = asMock<AuthRequest>({ user: { userId: 1, username: 'root', role: UserRole.ADMIN } });

function build(opts: { mfaOn?: boolean } = {}) {
  const service = {
    getAll: jest.fn(async () => ({ appName: 'X' })),
    setMany: jest.fn(async () => undefined),
  };
  const mfa = { isEnabled: jest.fn(async () => opts.mfaOn ?? false) };
  const ctrl = new AppSettingsController(asMock<AppSettingsService>(service), asMock<MfaService>(mfa));
  return { ctrl, service };
}

describe('AppSettingsController', () => {
  it('is restricted to admins', () => {
    expect(Reflect.getMetadata('roles', AppSettingsController)).toEqual([UserRole.ADMIN]);
  });

  it('getAll returns the settings', async () => {
    expect(await build().ctrl.getAll()).toEqual({ appName: 'X' });
  });

  it('update stores valid settings and returns the fresh map', async () => {
    const { ctrl, service } = build();
    expect(await ctrl.update({ appName: 'Acme', 'a.b_c-d': 'v' }, REQ)).toEqual({ appName: 'X' });
    expect(service.setMany).toHaveBeenCalledWith({ appName: 'Acme', 'a.b_c-d': 'v' });
  });

  it.each([
    ['null body', null],
    ['array body', ['a']],
    ['bad key chars', { 'a b': 'v' }],
    ['key too long', { ['k'.repeat(65)]: 'v' }],
    ['empty key', { '': 'v' }],
    ['non-string value', { a: invalid<string>(5) }],
    ['value too long', { a: 'x'.repeat(2001) }],
    ['app name too long', { appName: 'x'.repeat(61) }],
    ['the single-user flag', { singleUserMode: 'true' }],
    ['the sole user', { singleUserId: '1' }],
    ['too many settings', Object.fromEntries(Array.from({ length: 101 }, (_, i) => ['k' + i, 'v']))],
  ])('rejects %s without writing', async (_n, body) => {
    const { ctrl, service } = build();
    await expect(ctrl.update(invalid<Record<string, string>>(body), REQ)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.setMany).not.toHaveBeenCalled();
  });

  it('accepts exactly 100 settings and a 2000-char value', async () => {
    const { ctrl, service } = build();
    await ctrl.update(Object.fromEntries(Array.from({ length: 100 }, (_, i) => ['k' + i, 'x'.repeat(2000)])), REQ);
    expect(service.setMany).toHaveBeenCalled();
  });

  it('app name length is measured after trimming', async () => {
    const { ctrl, service } = build();
    await ctrl.update({ appName: '  ' + 'x'.repeat(60) + '  ' }, REQ);
    expect(service.setMany).toHaveBeenCalled();
  });

  it('only an admin with 2FA on may require it from all admins', async () => {
    const without = build();
    await expect(without.ctrl.update({ requireAdminMfa: 'true' }, REQ)).rejects.toThrow(BadRequestException);
    expect(without.service.setMany).not.toHaveBeenCalled();
    const withMfa = build({ mfaOn: true });
    await withMfa.ctrl.update({ requireAdminMfa: 'true' }, REQ);
    expect(withMfa.service.setMany).toHaveBeenCalledWith({ requireAdminMfa: 'true' });
  });

  it('switching the requirement off is always allowed; other values are refused', async () => {
    const { ctrl, service } = build();
    await ctrl.update({ requireAdminMfa: 'false' }, REQ);
    expect(service.setMany).toHaveBeenCalled();
    await expect(build({ mfaOn: true }).ctrl.update({ requireAdminMfa: 'yes' }, REQ)).rejects.toThrow(
      BadRequestException,
    );
  });
});
