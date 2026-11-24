import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from './note.entity';
import { NoteService } from './note.service';
import { NoteController } from './note.controller';
import { TaskAssignee } from '../task-assignee/task-assignee.entity';
import { TaskModule } from '../task/task.module';
import { ProjectModule } from '../project/project.module';
import { IdeaModule } from '../idea/idea.module';

@Module({
  imports: [TypeOrmModule.forFeature([Note, TaskAssignee]), TaskModule, ProjectModule, IdeaModule],
  providers: [NoteService],
  controllers: [NoteController],
})
export class NoteModule {}
