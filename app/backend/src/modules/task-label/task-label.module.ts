import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskLabel } from './task-label.entity';
import { TaskLabelService } from './task-label.service';
import { TaskLabelController } from './task-label.controller';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [TypeOrmModule.forFeature([TaskLabel]), TaskModule],
  providers: [TaskLabelService],
  controllers: [TaskLabelController],
  exports: [TaskLabelService],
})
export class TaskLabelModule {}
