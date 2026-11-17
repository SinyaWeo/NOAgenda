import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskAssignee } from './task-assignee.entity';
import { TaskAssigneeService } from './task-assignee.service';
import { TaskAssigneeController } from './task-assignee.controller';
import { TaskModule } from '../task/task.module';

import { NodeModule } from '../node/node.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NodeModule, NotificationModule, TypeOrmModule.forFeature([TaskAssignee]), TaskModule],
  providers: [TaskAssigneeService],
  controllers: [TaskAssigneeController],
  exports: [TaskAssigneeService],
})
export class TaskAssigneeModule {}
