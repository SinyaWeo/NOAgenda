import { ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth-user';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../modules/user/user-role.enum';

/** Methods that only read. */
export const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Global guard: every route needs a valid session JWT or API token unless it is marked
 * @Public(). It also applies the API-token rules in one place:
 *  - a read-only token may only use safe methods (GET/HEAD/OPTIONS);
 *  - no token, whatever its scope, may reach an admin-only route.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = AuthUser>(
    err: unknown,
    user: AuthUser | false | null,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) throw err || new UnauthorizedException();
    if (user.viaApiToken) {
      const req = context.switchToHttp().getRequest<Request>();
      if (user.apiTokenScope !== 'write' && !SAFE_METHODS.has(String(req.method).toUpperCase())) {
        throw new ForbiddenException('This API token is read-only');
      }
      const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
      if (roles?.includes(UserRole.ADMIN)) {
        throw new ForbiddenException('Admin actions require an interactive login, not an API token');
      }
    }
    return user as TUser;
  }
}
