import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from './favorite.entity';
import { FavoriteService } from './favorite.service';
import { FavoriteController } from './favorite.controller';

import { NodeModule } from '../node/node.module';

@Module({
  imports: [NodeModule, TypeOrmModule.forFeature([Favorite])],
  providers: [FavoriteService],
  controllers: [FavoriteController],
  exports: [FavoriteService],
})
export class FavoriteModule {}
