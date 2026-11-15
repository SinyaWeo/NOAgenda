import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NoApiTokenGuard } from '../auth/no-api-token.guard';
import { ApiTokenService } from './api-token.service';
import { ApiToken } from './api-token.entity';

@Controller('tokens')
@UseGuards(AuthGuard('jwt'), NoApiTokenGuard)
export class ApiTokenController {
  constructor(private readonly service: ApiTokenService) {}

  @Get()
  findAll(@Request() req: any): Promise<Omit<ApiToken, 'token'>[]> {
    return this.service.findAll(req.user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() body: { name: string; expiresAt?: Date },
    @Request() req: any,
  ): Promise<Omit<ApiToken, 'token'> & { rawToken: string }> {
    return this.service.create(req.user.userId, body.name, body.expiresAt);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    return this.service.remove(id, req.user.userId);
  }
}
