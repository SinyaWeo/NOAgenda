import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskRelation } from './task-relation.entity';
import { TaskRelationService } from './task-relation.service';
import { TaskRelationController } from './task-relation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskRelation])],
  providers: [TaskRelationService],
  controllers: [TaskRelationController],
  exports: [TaskRelationService],
})
export class TaskRelationModule {}
