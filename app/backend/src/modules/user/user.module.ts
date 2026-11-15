import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserSettingsController } from './user-settings.controller';
import { EmailVerificationModule } from '../email-verification/email-verification.module';
import { SessionModule } from '../session/session.module';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), EmailVerificationModule, SessionModule, AccountModule],
  providers: [UserService],
  controllers: [UserController, UserSettingsController],
  exports: [UserService],
})
export class UserModule {}
