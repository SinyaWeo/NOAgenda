import type { AuthRequest } from '../../common/auth-user';
import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { NodeAccessService } from '../node/node-access.service';
import { SubscriptionService } from './subscription.service';
import { Subscription, SubscriptionEntityType } from './subscription.entity';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    private readonly service: SubscriptionService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  findAll(@Request() req: AuthRequest): Promise<Subscription[]> {
    return this.service.findAll(req.user.userId);
  }

  @Put(':entityType/:entityId')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @Param('entityType') entityType: SubscriptionEntityType,
    @Param('entityId') entityId: number,
    @Request() req: AuthRequest,
  ): Promise<Subscription> {
    if (entityType !== 'project' && entityType !== 'task') throw new BadRequestException('Invalid entityType');
    // You may only subscribe to things you can read.
    await this.access.assertRead(req.user.userId, Number(entityId));
    return this.service.subscribe(req.user.userId, entityType, Number(entityId));
  }

  @Delete(':entityType/:entityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsubscribe(
    @Param('entityType') entityType: SubscriptionEntityType,
    @Param('entityId') entityId: number,
    @Request() req: AuthRequest,
  ): Promise<void> {
    return this.service.unsubscribe(req.user.userId, entityType, entityId);
  }
}
