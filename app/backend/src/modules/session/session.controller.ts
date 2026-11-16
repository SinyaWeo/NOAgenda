import { Controller, Get, Delete, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { SessionService, SafeSession } from './session.service';
import { NoApiTokenGuard } from '../auth/no-api-token.guard';

@Controller('user/sessions')
@UseGuards(NoApiTokenGuard)
export class SessionController {
  constructor(private readonly service: SessionService) {}

  @Get()
  findAll(@Request() req: any): Promise<SafeSession[]> {
    return this.service.findAll(req.user.userId, req.user.sessionId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@Param('id') id: number, @Request() req: any): Promise<void> {
    return this.service.revoke(Number(id), req.user.userId);
  }
}
