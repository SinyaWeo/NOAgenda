import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from '../auth-user';
import { UserRole } from '../../modules/user/user-role.enum';
import { SessionService } from '../../modules/session/session.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SAFE_METHODS } from './jwt-auth.guard';

/** The error the frontend recognises to ask for the password and retry. */
export const STEP_UP_REQUIRED = { code: 'STEP_UP_REQUIRED', message: 'Step-up required' };

/**
 * Every admin-only route that changes something (any method but GET/HEAD/OPTIONS on a route marked
 * `@Roles(ADMIN)`) needs a recent step-up: the admin re-entered their password in this session within
 * ADMIN_STEP_UP_MINUTES (`POST /user/step-up`). Reading stays free. Global, so a new admin endpoint is
 * covered without remembering a decorator. Non-admins pass through here and are refused by RolesGuard.
 */
@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.includes(UserRole.ADMIN)) return true;
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (SAFE_METHODS.has(String(req.method).toUpperCase())) return true;
    const user = req.user;
    if (!user || user.role !== UserRole.ADMIN) return true; // RolesGuard answers
    const until = user.sessionId ? await this.sessions.elevatedUntil(user.sessionId, user.userId) : null;
    if (!until || until.getTime() <= Date.now()) throw new ForbiddenException(STEP_UP_REQUIRED);
    return true;
  }
}
