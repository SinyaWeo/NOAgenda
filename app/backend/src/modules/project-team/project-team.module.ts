import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectTeam } from './project-team.entity';
import { ProjectTeamService } from './project-team.service';
import { ProjectTeamController } from './project-team.controller';
import { ProjectModule } from '../project/project.module';

import { NodeModule } from '../node/node.module';

@Module({
  imports: [NodeModule, TypeOrmModule.forFeature([ProjectTeam]), ProjectModule],
  providers: [ProjectTeamService],
  controllers: [ProjectTeamController],
  exports: [ProjectTeamService],
})
export class ProjectTeamModule {}
