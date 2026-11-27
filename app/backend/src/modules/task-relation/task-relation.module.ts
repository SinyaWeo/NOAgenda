import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskRelation } from './task-relation.entity';
import { TaskRelationService } from './task-relation.service';
import { TaskRelationController } from './task-relation.controller';
import { GanttController } from './gantt.controller';
import { TaskModule } from '../task/task.module';

import { NodeModule } from '../node/node.module';

@Module({
  imports: [NodeModule, TypeOrmModule.forFeature([TaskRelation]), TaskModule],
  providers: [TaskRelationService],
  controllers: [TaskRelationController, GanttController],
  exports: [TaskRelationService],
})
export class TaskRelationModule {}
