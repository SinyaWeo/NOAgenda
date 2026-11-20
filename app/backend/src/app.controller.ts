import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { AppSettingsService } from './modules/app-settings/app-settings.service';
import { Public } from './common/decorators/public.decorator';
import { APP_VERSION } from './common/constants/version';

@Controller()
export class AppController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly appSettings: AppSettingsService,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return 'NOAgenda backend is running!';
  }

  /** Liveness + readiness: 200 only if the database answers. Used by Docker healthchecks. */
  @Public()
  @Get('health')
  @SkipThrottle()
  async getHealth(): Promise<{ status: string }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ status: 'database unavailable' });
    }
    return { status: 'ok' };
  }

  @Public()
  @Get('info')
  async getInfo(): Promise<{ version: string; name: string }> {
    return { version: APP_VERSION, name: await this.appSettings.getAppName() };
  }
}
