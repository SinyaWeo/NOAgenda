import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { AppSettingsModule } from '../app-settings/app-settings.module';

@Global()
@Module({
  imports: [AppSettingsModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
