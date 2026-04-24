import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Webhook } from './webhook.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(): Promise<Webhook[]> {
    return this.webhookService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: number): Promise<Webhook | null> {
    return this.webhookService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Webhook>): Promise<Webhook> {
    return this.webhookService.create(body);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Webhook>): Promise<Webhook | null> {
    return this.webhookService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number): Promise<void> {
    return this.webhookService.remove(id);
  }
}
