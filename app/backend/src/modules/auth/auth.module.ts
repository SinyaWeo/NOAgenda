import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { SessionModule } from '../session/session.module';
import { ApiTokenModule } from '../api-token/api-token.module';
import { EmailVerificationModule } from '../email-verification/email-verification.module';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PasswordResetToken } from './password-reset-token.entity';

@Module({
  imports: [
    UserModule,
    SessionModule,
    ApiTokenModule,
    EmailVerificationModule,
    AppSettingsModule,
    PassportModule,
    TypeOrmModule.forFeature([PasswordResetToken]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        // Short-lived: the long-lived credential is the rotating refresh cookie.
        signOptions: {
          expiresIn: (process.env.ACCESS_TOKEN_TTL || '15m') as JwtSignOptions['expiresIn'],
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
