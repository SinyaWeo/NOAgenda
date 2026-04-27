import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskReminder } from './task-reminder.entity';
import { TaskReminderService } from './task-reminder.service';
import { TaskReminderController } from './task-reminder.controller';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [TypeOrmModule.forFeature([TaskReminder]), TaskModule],
  providers: [TaskReminderService],
  controllers: [TaskReminderController],
  exports: [TaskReminderService],
})
export class TaskReminderModule {}
