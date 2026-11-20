import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodeModule } from '../node/node.module';
import { TaskCompletion } from './task-completion.entity';
import { TaskCompletionService } from './task-completion.service';
import { TaskCompletionController } from './task-completion.controller';

@Module({
  imports: [NodeModule, TypeOrmModule.forFeature([TaskCompletion])],
  providers: [TaskCompletionService],
  controllers: [TaskCompletionController],
})
export class TaskCompletionModule {}
