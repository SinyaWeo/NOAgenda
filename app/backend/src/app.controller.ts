import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'NOAgenda backend is running!';
  }

  @Get('health')
  getHealth(): { status: string } {
    return { status: 'ok' };
  }

  @Get('info')
  getInfo(): { version: string; name: string } {
    return { version: process.env.npm_package_version ?? '0.1.0', name: 'NOAgenda' };
  }
}
