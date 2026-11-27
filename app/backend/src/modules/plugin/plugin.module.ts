import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plugin } from './plugin.entity';
import { UserPluginSetting } from './user-plugin-setting.entity';
import { PluginService } from './plugin.service';
import { PluginRegistry } from './plugin-registry.service';
import { PluginChannelService } from './plugin-channels.service';
import { AdminPluginController, PluginController, UserPluginController } from './plugin.controller';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';

/**
 * The plugin framework. Global, so each built-in plugin module (modules/plugins/*) can inject the
 * PluginRegistry and register itself.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Plugin, UserPluginSetting]), NotificationModule, UserModule],
  providers: [PluginService, PluginRegistry, PluginChannelService],
  controllers: [PluginController, AdminPluginController, UserPluginController],
  exports: [PluginService, PluginRegistry],
})
export class PluginModule {}
