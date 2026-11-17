import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectUser } from './project-user.entity';
import { ProjectUserService } from './project-user.service';
import { ProjectUserController } from './project-user.controller';
import { ProjectModule } from '../project/project.module';

import { NodeModule } from '../node/node.module';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [NodeModule, NotificationModule, UserModule, TypeOrmModule.forFeature([ProjectUser]), ProjectModule],
  providers: [ProjectUserService],
  controllers: [ProjectUserController],
  exports: [ProjectUserService],
})
export class ProjectUserModule {}
