import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Node } from '../node/node.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Node])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
