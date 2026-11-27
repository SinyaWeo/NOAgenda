import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MfaEnrollmentGuard } from '../guards/mfa-enrollment.guard';
import { ALLOW_WITHOUT_MFA_KEY } from '../decorators/allow-without-mfa.decorator';
import { UserRole } from '../../modules/user/user-role.enum';
import type { AuthUser } from '../auth-user';
import { asMock } from './test-utils';

const user = (mfaMissing: boolean): AuthUser => ({ userId: 1, username: 'ann', role: UserRole.USER, mfaMissing });

const ctx = (u: AuthUser | undefined, allowed = false) => {
  class C {}
  const handler = function h() {};
  if (allowed) Reflect.defineMetadata(ALLOW_WITHOUT_MFA_KEY, true, handler);
  return asMock<ExecutionContext>({
    getHandler: () => handler,
    getClass: () => C,
    switchToHttp: () => ({ getRequest: () => ({ user: u }) }),
  });
};

describe('MfaEnrollmentGuard', () => {
  const guard = new MfaEnrollmentGuard(new Reflector());
  const demo = process.env.DEMO_MODE;
  afterEach(() => {
    process.env.DEMO_MODE = demo;
  });

  it('lets everyone through who does not have to set up 2FA (and public routes, which have no user)', () => {
    expect(guard.canActivate(ctx(user(false)))).toBe(true);
    expect(guard.canActivate(ctx(undefined))).toBe(true);
  });

  it('holds back a user who must set up 2FA, with the code the frontend recognises', () => {
    try {
      guard.canActivate(ctx(user(true)));
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
      expect((e as ForbiddenException).getResponse()).toMatchObject({ code: 'MFA_ENROLLMENT_REQUIRED' });
    }
  });

  it('except on the routes marked @AllowWithoutMfa()', () => {
    expect(guard.canActivate(ctx(user(true), true))).toBe(true);
  });

  it('never on the demo, whose shared accounts cannot set up 2FA', () => {
    process.env.DEMO_MODE = 'true';
    expect(guard.canActivate(ctx(user(true)))).toBe(true);
  });
});
