import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectTeam } from './project-team.entity';
import { ProjectTeamService } from './project-team.service';
import { ProjectTeamController } from './project-team.controller';
import { NodeModule } from '../node/node.module';
import { TeamModule } from '../team/team.module';
import { TeamProjectsController } from './team-projects.controller';

@Module({
  imports: [NodeModule, TeamModule, TypeOrmModule.forFeature([ProjectTeam])],
  providers: [ProjectTeamService],
  controllers: [ProjectTeamController, TeamProjectsController],
  exports: [ProjectTeamService],
})
export class ProjectTeamModule {}
