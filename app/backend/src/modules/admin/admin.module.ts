import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UserModule } from '../user/user.module';
import { AccountModule } from '../account/account.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [UserModule, AccountModule, SessionModule],
  controllers: [AdminController],
})
export class AdminModule {}
