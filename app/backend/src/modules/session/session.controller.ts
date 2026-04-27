import { Controller, Get, Delete, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionService } from './session.service';
import { UserSession } from './session.entity';

@Controller('user/sessions')
@UseGuards(AuthGuard('jwt'))
export class SessionController {
  constructor(private readonly service: SessionService) {}

  @Get()
  findAll(@Request() req: any): Promise<UserSession[]> {
    return this.service.findAll(req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@Param('id') id: number, @Request() req: any): Promise<void> {
    return this.service.revoke(id, req.user.userId);
  }
}
