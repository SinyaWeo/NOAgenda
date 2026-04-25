import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FavoriteService } from './favorite.service';
import { Favorite, FavoriteEntityType } from './favorite.entity';

@Controller('favorites')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Request() req: any): Promise<Favorite[]> {
    return this.favoriteService.findByUser(req.user.userId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async add(
    @Request() req: any,
    @Body() body: { entityType: FavoriteEntityType; entityId: number },
  ): Promise<Favorite> {
    return this.favoriteService.add(req.user.userId, body.entityType, body.entityId);
  }

  @Delete(':entityType/:entityId')
  @UseGuards(AuthGuard('jwt'))
  async remove(
    @Request() req: any,
    @Param('entityType') entityType: FavoriteEntityType,
    @Param('entityId') entityId: number,
  ): Promise<void> {
    return this.favoriteService.remove(req.user.userId, entityType, Number(entityId));
  }
}
