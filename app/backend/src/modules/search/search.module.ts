import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Task } from '../task/task.entity';
import { Project } from '../project/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
