import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectTeam } from './project-team.entity';
import { ProjectTeamService } from './project-team.service';
import { ProjectTeamController } from './project-team.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectTeam])],
  providers: [ProjectTeamService],
  controllers: [ProjectTeamController],
  exports: [ProjectTeamService],
})
export class ProjectTeamModule {}
