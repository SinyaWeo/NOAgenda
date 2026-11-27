import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { NodeModule } from '../node/node.module';
import { ProjectTeamModule } from '../project-team/project-team.module';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [NodeModule, ProjectTeamModule, AppSettingsModule, UserModule],
  providers: [ProjectService],
  controllers: [ProjectController],
  exports: [ProjectService],
})
export class ProjectModule {}
