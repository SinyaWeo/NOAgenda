import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SingleUserModeGuard } from '../guards/single-user-mode.guard';
import { MULTI_USER_ONLY_KEY } from '../decorators/multi-user-only.decorator';
import type { AppSettingsService } from '../../modules/app-settings/app-settings.service';
import { asMock } from './test-utils';

const build = (single: boolean) => {
  const settings = { singleUserMode: jest.fn(async () => single) };
  return { guard: new SingleUserModeGuard(new Reflector(), asMock<AppSettingsService>(settings)), settings };
};
const ctx = (mark?: 'handler' | 'class') => {
  class C {}
  const handler = function h() {};
  if (mark) Reflect.defineMetadata(MULTI_USER_ONLY_KEY, true, mark === 'handler' ? handler : C);
  return asMock<ExecutionContext>({ getHandler: () => handler, getClass: () => C });
};

describe('SingleUserModeGuard', () => {
  it('refuses @MultiUserOnly routes (method or controller) in single-user mode', async () => {
    const { guard } = build(true);
    await expect(guard.canActivate(ctx('handler'))).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx('class'))).rejects.toThrow('Not available in single-user mode');
  });

  it('lets them through in multi-user mode', async () => {
    await expect(build(false).guard.canActivate(ctx('class'))).resolves.toBe(true);
  });

  it('never reads the setting for other routes', async () => {
    const { guard, settings } = build(true);
    await expect(guard.canActivate(ctx())).resolves.toBe(true);
    expect(settings.singleUserMode).not.toHaveBeenCalled();
  });
});
