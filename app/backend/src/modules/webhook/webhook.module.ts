import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook } from './webhook.entity';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { NodeModule } from '../node/node.module';
import { Node } from '../node/node.entity';
import { WebhookDispatcher } from './webhook-dispatcher.service';

@Module({
  imports: [TypeOrmModule.forFeature([Webhook, Node]), NodeModule],
  providers: [WebhookService, WebhookDispatcher],
  controllers: [WebhookController],
  exports: [WebhookService],
})
export class WebhookModule {}
