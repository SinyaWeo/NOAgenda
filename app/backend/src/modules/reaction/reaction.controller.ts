import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReactionService } from './reaction.service';
import { Reaction } from './reaction.entity';

@Controller('reactions')
export class ReactionController {
  constructor(private readonly service: ReactionService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(@Query('entityType') entityType: string, @Query('entityId') entityId: number): Promise<Reaction[]> {
    return this.service.findAll(entityType, entityId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  upsert(
    @Body() body: { entityType: string; entityId: number; reaction: string },
    @Request() req: any,
  ): Promise<Reaction> {
    return this.service.upsert(req.user.userId, body.entityType, body.entityId, body.reaction);
  }

  @Delete()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Body() body: { entityType: string; entityId: number; reaction: string },
    @Request() req: any,
  ): Promise<void> {
    return this.service.remove(req.user.userId, body.entityType, body.entityId, body.reaction);
  }
}
