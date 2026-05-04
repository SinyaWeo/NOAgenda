import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppSettingsService } from './app-settings.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../user/user-role.enum';

@Controller('admin/settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  async getAll(): Promise<Record<string, string>> {
    return this.appSettingsService.getAll();
  }

  @Patch()
  async update(@Body() body: Record<string, string>): Promise<Record<string, string>> {
    await this.appSettingsService.setMany(body);
    return this.appSettingsService.getAll();
  }
}
