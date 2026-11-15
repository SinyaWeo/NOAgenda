import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attachment } from './attachment.entity';
import { AttachmentService } from './attachment.service';
import { AttachmentController } from './attachment.controller';
import { TaskModule } from '../task/task.module';
import { UserModule } from '../user/user.module';
import { NodeModule } from '../node/node.module';

@Module({
  imports: [TypeOrmModule.forFeature([Attachment]), TaskModule, UserModule, NodeModule],
  providers: [AttachmentService],
  controllers: [AttachmentController],
  exports: [AttachmentService],
})
export class AttachmentModule {}
