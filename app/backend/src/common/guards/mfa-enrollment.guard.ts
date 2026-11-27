import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from '../auth-user';
import { isDemoMode } from '../demo-users';
import { ALLOW_WITHOUT_MFA_KEY } from '../decorators/allow-without-mfa.decorator';

/** The error the frontend recognises to show the 2FA setup instead of the app. */
export const MFA_ENROLLMENT_REQUIRED = {
  code: 'MFA_ENROLLMENT_REQUIRED',
  message: 'Set up two-factor authentication first',
};

/**
 * Global, after JwtAuthGuard: a user who must use two-factor authentication (an admin while the admin
 * setting requires it, or a member of a team that does; `mfaMissing` comes with the session lookup) and
 * has not switched it on can only reach the routes marked `@AllowWithoutMfa()` until they do. Off on the
 * demo, whose shared accounts cannot set up 2FA.
 */
@Injectable()
export class MfaEnrollmentGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    if (!user?.mfaMissing || isDemoMode()) return true;
    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_WITHOUT_MFA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed) return true;
    throw new ForbiddenException(MFA_ENROLLMENT_REQUIRED);
  }
}
