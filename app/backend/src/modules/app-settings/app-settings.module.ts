import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting } from './app-setting.entity';
import { AppSettingsService } from './app-settings.service';
import { AppSettingsController } from './app-settings.controller';
import { MfaModule } from '../mfa/mfa.module';

@Module({
  imports: [TypeOrmModule.forFeature([AppSetting]), MfaModule],
  providers: [AppSettingsService],
  controllers: [AppSettingsController],
  exports: [AppSettingsService],
})
export class AppSettingsModule {}
