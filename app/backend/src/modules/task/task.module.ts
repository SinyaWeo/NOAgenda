import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodeModule } from '../node/node.module';
import { TaskAssignee } from '../task-assignee/task-assignee.entity';
import { TeamModule } from '../team/team.module';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NodeModule, TeamModule, UserModule, NotificationModule, TypeOrmModule.forFeature([TaskAssignee])],
  providers: [TaskService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
