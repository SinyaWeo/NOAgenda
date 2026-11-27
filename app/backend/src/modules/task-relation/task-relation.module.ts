import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskRelation } from './task-relation.entity';
import { TaskRelationService } from './task-relation.service';
import { TaskRelationController } from './task-relation.controller';
import { DependenciesController } from './dependencies.controller';
import { TaskModule } from '../task/task.module';

import { NodeModule } from '../node/node.module';

@Module({
  imports: [NodeModule, TypeOrmModule.forFeature([TaskRelation]), TaskModule],
  providers: [TaskRelationService],
  controllers: [TaskRelationController, DependenciesController],
  exports: [TaskRelationService],
})
export class TaskRelationModule {}
