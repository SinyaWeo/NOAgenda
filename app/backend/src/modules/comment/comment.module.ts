import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './comment.entity';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { TaskModule } from '../task/task.module';
import { UserModule } from '../user/user.module';
import { NodeModule } from '../node/node.module';

@Module({
  imports: [TypeOrmModule.forFeature([Comment]), TaskModule, UserModule, NodeModule],
  providers: [CommentService],
  controllers: [CommentController],
  exports: [CommentService],
})
export class CommentModule {}
