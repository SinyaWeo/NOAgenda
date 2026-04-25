import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectView } from './project-view.entity';
import { ProjectViewService } from './project-view.service';
import { ProjectViewController } from './project-view.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectView])],
  providers: [ProjectViewService],
  controllers: [ProjectViewController],
  exports: [ProjectViewService],
})
export class ProjectViewModule {}
