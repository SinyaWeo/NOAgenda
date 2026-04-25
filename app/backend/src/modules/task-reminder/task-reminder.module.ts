import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskReminder } from './task-reminder.entity';
import { TaskReminderService } from './task-reminder.service';
import { TaskReminderController } from './task-reminder.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskReminder])],
  providers: [TaskReminderService],
  controllers: [TaskReminderController],
  exports: [TaskReminderService],
})
export class TaskReminderModule {}
