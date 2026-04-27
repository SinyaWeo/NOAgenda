import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KanbanBucket } from './kanban-bucket.entity';
import { KanbanBucketService } from './kanban-bucket.service';
import { KanbanBucketController } from './kanban-bucket.controller';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [TypeOrmModule.forFeature([KanbanBucket]), ProjectModule],
  providers: [KanbanBucketService],
  controllers: [KanbanBucketController],
})
export class KanbanBucketModule {}
