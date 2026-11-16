import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Webhook } from './webhook.entity';
import { NodeAccessService } from '../node/node-access.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import { assertPublicHttpUrl } from '../../common/url-guard';

/** The signing secret is write-only: responses say whether one is set, never what it is. */
function maskSecret(w: Webhook): Webhook {
  const { secret, ...rest } = w as any;
  return { ...rest, hasSecret: !!secret } as Webhook;
}

@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly access: NodeAccessService,
  ) {}

  /**
   * User webhooks belong to their owner only. Project webhooks (which expose
   * secrets) require ADMIN on the project.
   */
  private async assertCan(webhook: Webhook, userId: number): Promise<void> {
    if (webhook.projectId != null) return this.access.assertAdmin(userId, webhook.projectId);
    if (webhook.userId == null || webhook.userId !== userId) throw new ForbiddenException();
  }

  @Get()
  async findAll(
    @Request() req: any,
    @Query('projectId') projectId?: string,
  ): Promise<Webhook[]> {
    if (projectId) {
      await this.access.assertAdmin(req.user.userId, Number(projectId));
      return (await this.webhookService.findAll({ projectId: Number(projectId) })).map(maskSecret);
    }
    // user-level webhooks: no projectId
    return (await this.webhookService.findAll({ userId: req.user.userId })).map(maskSecret);
  }

  @Get(':id')
  async findById(@Param('id') id: number, @Request() req: any): Promise<Webhook | null> {
    const webhook = await this.webhookService.findById(id);
    if (!webhook) throw new NotFoundException();
    await this.assertCan(webhook, req.user.userId);
    return maskSecret(webhook);
  }

  @Post()
  async create(@Request() req: any, @Body() body: CreateWebhookDto): Promise<Webhook> {
    const projectId = body.projectId;
    if (projectId !== undefined) await this.access.assertAdmin(req.user.userId, projectId);
    await assertPublicHttpUrl(body.url);
    return maskSecret(await this.webhookService.create({
      url: body.url,
      event: body.event ?? '*',
      secret: body.secret,
      active: body.active,
      config: body.config,
      projectId,
      userId: projectId !== undefined ? undefined : req.user.userId,
    }));
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: UpdateWebhookDto, @Request() req: any): Promise<Webhook | null> {
    const webhook = await this.webhookService.findById(id);
    if (!webhook) throw new NotFoundException();
    await this.assertCan(webhook, req.user.userId);
    if (body.url !== undefined) await assertPublicHttpUrl(body.url);
    const updated = await this.webhookService.update(id, { ...body });
    return updated ? maskSecret(updated) : null;
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const webhook = await this.webhookService.findById(id);
    if (!webhook) throw new NotFoundException();
    await this.assertCan(webhook, req.user.userId);
    return this.webhookService.remove(id);
  }
}
