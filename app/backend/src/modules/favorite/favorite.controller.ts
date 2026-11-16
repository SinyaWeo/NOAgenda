import { Controller, Get, Post, Delete, Param, Body, Request, BadRequestException } from '@nestjs/common';
import { NodeAccessService } from '../node/node-access.service';
import { FavoriteService } from './favorite.service';
import { Favorite, FavoriteEntityType } from './favorite.entity';

@Controller('favorites')
export class FavoriteController {
  constructor(
    private readonly favoriteService: FavoriteService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  async findAll(@Request() req: any): Promise<Favorite[]> {
    return this.favoriteService.findByUser(req.user.userId);
  }

  @Post()
  async add(
    @Request() req: any,
    @Body() body: { entityType: FavoriteEntityType; entityId: number },
  ): Promise<Favorite> {
    if (!Object.values(FavoriteEntityType).includes(body?.entityType)) throw new BadRequestException('Invalid entityType');
    const entityId = Number(body.entityId);
    if (!Number.isInteger(entityId) || entityId < 1) throw new BadRequestException('Invalid entityId');
    // You may only favorite things you can read.
    await this.access.assertRead(req.user.userId, entityId);
    return this.favoriteService.add(req.user.userId, body.entityType, entityId);
  }

  @Delete(':entityType/:entityId')
  async remove(
    @Request() req: any,
    @Param('entityType') entityType: FavoriteEntityType,
    @Param('entityId') entityId: number,
  ): Promise<void> {
    return this.favoriteService.remove(req.user.userId, entityType, Number(entityId));
  }
}
