import { Module } from '@nestjs/common';
import { PluginRegistry } from '../../plugin/plugin-registry.service';
import { chatWebhookPlugin } from './chat-webhook.plugin';

/** Built-in plugin: notifications to the user's own chat (see chat-webhook.plugin.ts). */
@Module({})
export class ChatWebhookPluginModule {
  constructor(registry: PluginRegistry) {
    registry.register(chatWebhookPlugin);
  }
}
