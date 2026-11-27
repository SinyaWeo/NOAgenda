import type { AuthRequest } from '../../common/auth-user';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { NotInDemoGuard } from '../../common/guards/not-in-demo.guard';
import { UserRole } from '../user/user-role.enum';
import { UserService } from '../user/user.service';
import { PluginService, type AdminPluginView, type UserPluginView } from './plugin.service';
import { PluginChannelService } from './plugin-channels.service';
import { UpdatePluginDto, UpdateUserPluginDto } from './dto/plugin.dto';

/** The enabled plugins that have per-user settings (what the settings page offers). */
@Controller('plugins')
export class PluginController {
  constructor(private readonly plugins: PluginService) {}

  @Get()
  async list(): Promise<{ key: string; name: string; description: string; isChannel: boolean }[]> {
    return this.plugins.publicList();
  }
}

/** App admin: every built-in plugin, switched on/off and configured here. Secrets are write-only. */
@Controller('admin/plugins')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPluginController {
  constructor(private readonly plugins: PluginService) {}

  @Get()
  async list(): Promise<AdminPluginView[]> {
    return this.plugins.adminList();
  }

  @Patch(':key')
  @UseGuards(NotInDemoGuard)
  async update(@Param('key') key: string, @Body() body: UpdatePluginDto): Promise<AdminPluginView> {
    return this.plugins.adminUpdate(key, body);
  }
}

/** The signed-in user's own plugin settings (e.g. where a notification channel delivers). */
@Controller('user/plugins')
export class UserPluginController {
  constructor(
    private readonly plugins: PluginService,
    private readonly channels: PluginChannelService,
    private readonly users: UserService,
  ) {}

  @Get()
  async list(@Request() req: AuthRequest): Promise<UserPluginView[]> {
    return this.plugins.userList(req.user.userId);
  }

  @Put(':key')
  @UseGuards(NotInDemoGuard)
  async update(
    @Param('key') key: string,
    @Body() body: UpdateUserPluginDto,
    @Request() req: AuthRequest,
  ): Promise<UserPluginView> {
    return this.plugins.userUpdate(req.user.userId, key, body);
  }

  @Delete(':key')
  @HttpCode(204)
  async remove(@Param('key') key: string, @Request() req: AuthRequest): Promise<void> {
    await this.plugins.userRemove(req.user.userId, key);
  }

  /** Send a test message through the user's channel now and say what happened. */
  @Post(':key/test')
  @HttpCode(200)
  @UseGuards(NotInDemoGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async test(@Param('key') key: string, @Request() req: AuthRequest): Promise<{ ok: boolean; error: string | null }> {
    const languages = await this.users.languagesOf([req.user.userId]);
    return this.channels.test(req.user.userId, key, languages.get(req.user.userId) ?? null);
  }
}
