import { Module } from '@nestjs/common';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { SingleUserController } from './single-user.controller';
import { SingleUserService } from './single-user.service';

@Module({
  imports: [AppSettingsModule],
  providers: [SingleUserService],
  controllers: [SingleUserController],
})
export class SingleUserModule {}
