import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Webhook } from './webhook.entity';
import { AuthGuard } from '@nestjs/passport';
import { NodeAccessService } from '../node/node-access.service';

function assertHttpUrl(url: unknown): asserts url is string {
  let ok = false;
  if (typeof url === 'string' && url.length <= 2048) {
    try {
      const u = new URL(url);
      ok = u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      ok = false;
    }
  }
  if (!ok) throw new BadRequestException('url must be a valid http(s) URL');
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
  @UseGuards(AuthGuard('jwt'))
  async findAll(
    @Request() req: any,
    @Query('projectId') projectId?: string,
  ): Promise<Webhook[]> {
    if (projectId) {
      await this.access.assertAdmin(req.user.userId, Number(projectId));
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
    await this.assertCan(webhook, req.user.userId);
    return webhook;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Request() req: any, @Body() body: Partial<Webhook>): Promise<Webhook> {
    assertHttpUrl(body?.url);
    if (typeof body.event !== 'string' || !body.event || body.event.length > 100) {
      throw new BadRequestException('event is required');
    }
    const projectId = body.projectId ? Number(body.projectId) : undefined;
    if (projectId !== undefined) {
      if (!Number.isInteger(projectId) || projectId < 1) throw new BadRequestException('Invalid projectId');
      await this.access.assertAdmin(req.user.userId, projectId);
    }
    return this.webhookService.create({
      url: body.url,
      event: body.event,
      secret: body.secret,
      active: body.active,
      config: body.config,
      projectId,
      userId: projectId !== undefined ? undefined : req.user.userId,
    });
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Webhook>, @Request() req: any): Promise<Webhook | null> {
    const webhook = await this.webhookService.findById(id);
    if (!webhook) throw new NotFoundException();
    await this.assertCan(webhook, req.user.userId);
    // Prevent mass-assignment of ownership/identity fields
    const { id: _id, userId: _u, projectId: _p, createdAt: _c, updatedAt: _up, ...safeBody } = body as any;
    if (safeBody.url !== undefined) assertHttpUrl(safeBody.url);
    return this.webhookService.update(id, safeBody);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const webhook = await this.webhookService.findById(id);
    if (!webhook) throw new NotFoundException();
    await this.assertCan(webhook, req.user.userId);
    return this.webhookService.remove(id);
  }
}
