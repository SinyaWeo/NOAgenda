import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly dataSource: DataSource) {}

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
  getInfo(): { version: string; name: string } {
    return { version: process.env.npm_package_version ?? '0.1.0', name: 'NOAgenda' };
  }
}
