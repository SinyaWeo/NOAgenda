import { NodeModule } from '../node/node.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KanbanBucket } from './kanban-bucket.entity';
import { KanbanBucketService } from './kanban-bucket.service';
import { KanbanBucketController } from './kanban-bucket.controller';

@Module({
  imports: [NodeModule, TypeOrmModule.forFeature([KanbanBucket])],
  providers: [KanbanBucketService],
  controllers: [KanbanBucketController],
})
export class KanbanBucketModule {}
