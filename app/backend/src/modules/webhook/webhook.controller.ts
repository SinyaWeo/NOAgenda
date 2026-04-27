import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Webhook } from './webhook.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(
    @Request() req: any,
    @Query('projectId') projectId?: string,
  ): Promise<Webhook[]> {
    if (projectId) {
      return this.webhookService.findAll({ projectId: Number(projectId) });
    }
    // user-level webhooks: no projectId
    return this.webhookService.findAll({ userId: req.user.userId });
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: number, @Request() req: any): Promise<Webhook | null> {
    const webhook = await this.webhookService.findById(id);
    if (!webhook) throw new NotFoundException();
    if (webhook.userId !== undefined && webhook.userId !== req.user.userId) throw new ForbiddenException();
    return webhook;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Request() req: any, @Body() body: Partial<Webhook>): Promise<Webhook> {
    // Attach user id for scoping; projectId may already be set in body
    return this.webhookService.create({ ...body, userId: body.projectId ? undefined : req.user.userId });
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Webhook>, @Request() req: any): Promise<Webhook | null> {
    const webhook = await this.webhookService.findById(id);
    if (!webhook) throw new NotFoundException();
    if (webhook.userId !== undefined && webhook.userId !== req.user.userId) throw new ForbiddenException();
    // Prevent mass-assignment of ownership/identity fields
    const { id: _id, userId: _u, projectId: _p, ...safeBody } = body as any;
    return this.webhookService.update(id, safeBody);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const webhook = await this.webhookService.findById(id);
    if (!webhook) throw new NotFoundException();
    if (webhook.userId !== undefined && webhook.userId !== req.user.userId) throw new ForbiddenException();
    return this.webhookService.remove(id);
  }
}
