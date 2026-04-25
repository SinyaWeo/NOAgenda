import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskAssignee } from './task-assignee.entity';
import { TaskAssigneeService } from './task-assignee.service';
import { TaskAssigneeController } from './task-assignee.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskAssignee])],
  providers: [TaskAssigneeService],
  controllers: [TaskAssigneeController],
  exports: [TaskAssigneeService],
})
export class TaskAssigneeModule {}
