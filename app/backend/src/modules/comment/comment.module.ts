import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './comment.entity';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { TaskModule } from '../task/task.module';
import { UserModule } from '../user/user.module';
import { NodeModule } from '../node/node.module';
import { TaskAssigneeModule } from '../task-assignee/task-assignee.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment]),
    TaskModule,
    UserModule,
    NodeModule,
    TaskAssigneeModule,
    NotificationModule,
  ],
  providers: [CommentService],
  controllers: [CommentController],
  exports: [CommentService],
})
export class CommentModule {}
