import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UserModule } from '../user/user.module';
import { AccountModule } from '../account/account.module';
import { SessionModule } from '../session/session.module';
import { TeamModule } from '../team/team.module';
import { TeamMemberModule } from '../team-member/team-member.module';

@Module({
  imports: [UserModule, AccountModule, SessionModule, TeamModule, TeamMemberModule],
  controllers: [AdminController],
})
export class AdminModule {}
