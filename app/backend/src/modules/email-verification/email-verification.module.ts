import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { EmailVerificationToken } from '../auth/email-verification-token.entity';
import { EmailVerificationService } from './email-verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, EmailVerificationToken])],
  providers: [EmailVerificationService],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}
