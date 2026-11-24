import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppSettingsService } from '../../modules/app-settings/app-settings.service';
import { MULTI_USER_ONLY_KEY } from '../decorators/multi-user-only.decorator';

export const NOT_IN_SINGLE_USER_MODE = 'Not available in single-user mode';

/** Global: refuses routes marked `@MultiUserOnly()` while the instance runs in single-user mode. */
@Injectable()
export class SingleUserModeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly settings: AppSettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const multiOnly = this.reflector.getAllAndOverride<boolean>(MULTI_USER_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (multiOnly && (await this.settings.singleUserMode())) throw new ForbiddenException(NOT_IN_SINGLE_USER_MODE);
    return true;
  }
}
