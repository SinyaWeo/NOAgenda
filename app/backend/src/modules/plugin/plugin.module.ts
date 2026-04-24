import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plugin } from './plugin.entity';
import { PluginService } from './plugin.service';
import { PluginController } from './plugin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Plugin])],
  providers: [PluginService],
  controllers: [PluginController],
  exports: [PluginService],
})
export class PluginModule {}
