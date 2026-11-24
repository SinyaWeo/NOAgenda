import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StepUpGuard } from '../guards/step-up.guard';
import { UserRole } from '../../modules/user/user-role.enum';
import type { SessionService } from '../../modules/session/session.service';
import type { AuthUser } from '../auth-user';
import { asMock } from './test-utils';

const ADMIN: AuthUser = { userId: 1, username: 'root', role: UserRole.ADMIN, sessionId: 9 };

function build(until: Date | null) {
  const sessions = { elevatedUntil: jest.fn(async () => until) };
  return { guard: new StepUpGuard(new Reflector(), asMock<SessionService>(sessions)), sessions };
}

const ctx = (method: string, user: AuthUser | undefined, roles?: UserRole[], onClass = false) => {
  class C {}
  const handler = function h() {};
  if (roles) Reflect.defineMetadata('roles', roles, onClass ? C : handler);
  return asMock<ExecutionContext>({
    getHandler: () => handler,
    getClass: () => C,
    switchToHttp: () => ({ getRequest: () => ({ method, user }) }),
  });
};

const soon = () => new Date(Date.now() + 60_000);
const past = () => new Date(Date.now() - 1);

describe('StepUpGuard', () => {
  it('ignores routes that are not admin-only', async () => {
    const { guard, sessions } = build(null);
    await expect(guard.canActivate(ctx('DELETE', ADMIN))).resolves.toBe(true);
    await expect(guard.canActivate(ctx('DELETE', ADMIN, [UserRole.USER]))).resolves.toBe(true);
    expect(sessions.elevatedUntil).not.toHaveBeenCalled();
  });

  it('lets an admin read without stepping up', async () => {
    const { guard } = build(null);
    for (const m of ['GET', 'HEAD', 'OPTIONS'])
      await expect(guard.canActivate(ctx(m, ADMIN, [UserRole.ADMIN]))).resolves.toBe(true);
  });

  it('requires a step-up for admin changes, also when @Roles is on the controller', async () => {
    const { guard } = build(null);
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      await expect(guard.canActivate(ctx(m, ADMIN, [UserRole.ADMIN]))).rejects.toBeInstanceOf(ForbiddenException);
    }
    await expect(guard.canActivate(ctx('PATCH', ADMIN, [UserRole.ADMIN], true))).rejects.toMatchObject({
      response: { code: 'STEP_UP_REQUIRED' },
    });
  });

  it('accepts a current step-up of this session and refuses an expired one', async () => {
    const ok = build(soon());
    await expect(ok.guard.canActivate(ctx('DELETE', ADMIN, [UserRole.ADMIN]))).resolves.toBe(true);
    expect(ok.sessions.elevatedUntil).toHaveBeenCalledWith(9, 1);
    const expired = build(past());
    await expect(expired.guard.canActivate(ctx('DELETE', ADMIN, [UserRole.ADMIN]))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('refuses an admin without a session (no way to step up)', async () => {
    const { guard, sessions } = build(soon());
    const noSession = { ...ADMIN, sessionId: undefined };
    await expect(guard.canActivate(ctx('DELETE', noSession, [UserRole.ADMIN]))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(sessions.elevatedUntil).not.toHaveBeenCalled();
  });

  it('leaves non-admins to RolesGuard (no password prompt for them)', async () => {
    const { guard } = build(null);
    const user: AuthUser = { userId: 2, username: 'ann', role: UserRole.USER, sessionId: 3 };
    await expect(guard.canActivate(ctx('DELETE', user, [UserRole.ADMIN]))).resolves.toBe(true);
  });
});
