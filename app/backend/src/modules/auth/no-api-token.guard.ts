import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Blocks requests authenticated with an API token. Use on account-security
 * endpoints (password, email, sessions, tokens, deletion) that must require an
 * interactive login.
 */
@Injectable()
export class NoApiTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.viaApiToken) {
      throw new ForbiddenException('This action requires an interactive login, not an API token');
    }
    return true;
  }
}
