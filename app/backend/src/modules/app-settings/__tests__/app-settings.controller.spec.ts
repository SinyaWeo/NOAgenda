import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { AppSettingsController } from '../app-settings.controller';
import { UserRole } from '../../user/user-role.enum';
import type { AppSettingsService } from '../app-settings.service';
import { asMock, invalid } from '../../../common/__tests__/test-utils';

function build() {
  const service = {
    getAll: jest.fn(async () => ({ appName: 'X' })),
    setMany: jest.fn(async () => undefined),
  };
  return { ctrl: new AppSettingsController(asMock<AppSettingsService>(service)), service };
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
    expect(await ctrl.update({ appName: 'Acme', 'a.b_c-d': 'v' })).toEqual({ appName: 'X' });
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
    await expect(ctrl.update(invalid<Record<string, string>>(body))).rejects.toBeInstanceOf(BadRequestException);
    expect(service.setMany).not.toHaveBeenCalled();
  });

  it('accepts exactly 100 settings and a 2000-char value', async () => {
    const { ctrl, service } = build();
    await ctrl.update(Object.fromEntries(Array.from({ length: 100 }, (_, i) => ['k' + i, 'x'.repeat(2000)])));
    expect(service.setMany).toHaveBeenCalled();
  });

  it('app name length is measured after trimming', async () => {
    const { ctrl, service } = build();
    await ctrl.update({ appName: '  ' + 'x'.repeat(60) + '  ' });
    expect(service.setMany).toHaveBeenCalled();
  });
});
