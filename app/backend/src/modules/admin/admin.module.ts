import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UserModule } from '../user/user.module';
import { AccountModule } from '../account/account.module';
import { SessionModule } from '../session/session.module';
import { TeamModule } from '../team/team.module';
import { ActivityModule } from '../activity/activity.module';
import { TeamMemberModule } from '../team-member/team-member.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
import { ProjectTransferService } from './project-transfer.service';

@Module({
  imports: [
    UserModule,
    AccountModule,
    SessionModule,
    TeamModule,
    TeamMemberModule,
    ActivityModule,
    NotificationModule,
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [ProjectTransferService],
})
export class AdminModule {}
