import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskReminder } from './task-reminder.entity';
import { TaskReminderService } from './task-reminder.service';
import { TaskReminderController } from './task-reminder.controller';
import { TaskModule } from '../task/task.module';

import { NodeModule } from '../node/node.module';
import { NotificationModule } from '../notification/notification.module';
import { TaskAssigneeModule } from '../task-assignee/task-assignee.module';

@Module({
  imports: [NodeModule, NotificationModule, TaskAssigneeModule, TypeOrmModule.forFeature([TaskReminder]), TaskModule],
  providers: [TaskReminderService],
  controllers: [TaskReminderController],
  exports: [TaskReminderService],
})
export class TaskReminderModule {}
