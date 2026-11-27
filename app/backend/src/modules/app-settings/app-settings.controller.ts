import type { AuthRequest } from '../../common/auth-user';
import { Controller, Get, Patch, Body, UseGuards, BadRequestException, Request } from '@nestjs/common';
import { MfaService } from '../mfa/mfa.service';
import { REQUIRE_ADMIN_MFA_KEY } from '../mfa/mfa-policy';
import { AppSettingsService, SINGLE_USER_KEYS } from './app-settings.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../user/user-role.enum';

@Controller('admin/settings')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AppSettingsController {
  constructor(
    private readonly appSettingsService: AppSettingsService,
    private readonly mfa: MfaService,
  ) {}

  @Get()
  async getAll(): Promise<Record<string, string>> {
    return this.appSettingsService.getAll();
  }

  @Patch()
  async update(@Body() body: Record<string, string>, @Request() req: AuthRequest): Promise<Record<string, string>> {
    // Free-form key/value map: bound its size and shape (it cannot go through a DTO class).
    const entries = body && typeof body === 'object' && !Array.isArray(body) ? Object.entries(body) : null;
    if (!entries || entries.length > 100) throw new BadRequestException('Expected an object with at most 100 settings');
    for (const [key, value] of entries) {
      if (!/^[A-Za-z0-9_.-]{1,64}$/.test(key))
        throw new BadRequestException(`Invalid setting name "${key.slice(0, 20)}"`);
      if ((SINGLE_USER_KEYS as readonly string[]).includes(key))
        throw new BadRequestException(`Setting "${key}" is changed by the single-user mode switch only`);
      if (typeof value !== 'string' || value.length > 2000)
        throw new BadRequestException(`Setting "${key}" must be a string of at most 2000 characters`);
    }
    if (typeof body.appName === 'string' && body.appName.trim().length > 60)
      throw new BadRequestException('The app name must be at most 60 characters');
    if (body[REQUIRE_ADMIN_MFA_KEY] !== undefined && !['true', 'false'].includes(body[REQUIRE_ADMIN_MFA_KEY]))
      throw new BadRequestException(`Setting "${REQUIRE_ADMIN_MFA_KEY}" must be "true" or "false"`);
    // Requiring 2FA from admins while having none yourself would lock you out of the admin area at once.
    if (body[REQUIRE_ADMIN_MFA_KEY] === 'true' && !(await this.mfa.isEnabled(req.user.userId)))
      throw new BadRequestException('Turn on two-factor authentication for your own account first');
    await this.appSettingsService.setMany(body);
    return this.appSettingsService.getAll();
  }
}
