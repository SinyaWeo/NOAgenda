import { Controller, Get, Post, Delete, Body, Param, Query, Request, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { NodeAccessService } from '../node/node-access.service';
import { ReactionService } from './reaction.service';
import { Reaction } from './reaction.entity';

@Controller('reactions')
export class ReactionController {
  constructor(
    private readonly service: ReactionService,
    private readonly access: NodeAccessService,
  ) {}

  /** Reactions are only supported on tasks and projects the caller can read. */
  private async check(userId: number, entityType: unknown, entityId: unknown): Promise<number> {
    if (entityType !== 'task' && entityType !== 'project') throw new BadRequestException('entityType must be "task" or "project"');
    const id = Number(entityId);
    if (!Number.isInteger(id) || id < 1) throw new BadRequestException('Invalid entityId');
    await this.access.assertRead(userId, id);
    return id;
  }

  @Get()
  async findAll(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: number,
    @Request() req: any,
  ): Promise<Reaction[]> {
    const id = await this.check(req.user.userId, entityType, entityId);
    return this.service.findAll(entityType, id);
  }

  @Post()
  async upsert(
    @Body() body: { entityType: string; entityId: number; reaction: string },
    @Request() req: any,
  ): Promise<Reaction> {
    const id = await this.check(req.user.userId, body?.entityType, body?.entityId);
    if (typeof body.reaction !== 'string' || !body.reaction.trim() || body.reaction.length > 100) {
      throw new BadRequestException('reaction is required (max 100 characters)');
    }
    return this.service.upsert(req.user.userId, body.entityType, id, body.reaction);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Body() body: { entityType: string; entityId: number; reaction: string },
    @Request() req: any,
  ): Promise<void> {
    const id = await this.check(req.user.userId, body?.entityType, body?.entityId);
    if (typeof body.reaction !== 'string' || !body.reaction.trim()) {
      throw new BadRequestException('reaction is required');
    }
    return this.service.remove(req.user.userId, body.entityType, id, body.reaction);
  }
}
