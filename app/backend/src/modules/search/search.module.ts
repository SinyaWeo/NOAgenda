import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { NodeModule } from '../node/node.module';

@Module({
  imports: [NodeModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
