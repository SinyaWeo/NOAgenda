import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectView } from './project-view.entity';
import { ProjectViewService } from './project-view.service';
import { ProjectViewController } from './project-view.controller';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectView]), ProjectModule],
  providers: [ProjectViewService],
  controllers: [ProjectViewController],
  exports: [ProjectViewService],
})
export class ProjectViewModule {}
