import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { isDemoMode } from '../demo-users';

/**
 * Blocks account-changing endpoints (password, email, deletion) and file uploads (attachments, avatars) on the public demo instance
 * (DEMO_MODE=true). The demo accounts are shared and listed on the login page, so one visitor must
 * not be able to lock the others out until the nightly reset.
 */
@Injectable()
export class NotInDemoGuard implements CanActivate {
  canActivate(): boolean {
    if (isDemoMode()) throw new ForbiddenException('This action is disabled on the demo');
    return true;
  }
}
