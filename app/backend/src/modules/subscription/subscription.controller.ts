import { Controller, Get, Put, Delete, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscriptionService } from './subscription.service';
import { Subscription, SubscriptionEntityType } from './subscription.entity';

@Controller('subscriptions')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionController {
  constructor(private readonly service: SubscriptionService) {}

  @Get()
  findAll(@Request() req: any): Promise<Subscription[]> {
    return this.service.findAll(req.user.userId);
  }

  @Put(':entityType/:entityId')
  @HttpCode(HttpStatus.CREATED)
  subscribe(
    @Param('entityType') entityType: SubscriptionEntityType,
    @Param('entityId') entityId: number,
    @Request() req: any,
  ): Promise<Subscription> {
    return this.service.subscribe(req.user.userId, entityType, entityId);
  }

  @Delete(':entityType/:entityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsubscribe(
    @Param('entityType') entityType: SubscriptionEntityType,
    @Param('entityId') entityId: number,
    @Request() req: any,
  ): Promise<void> {
    return this.service.unsubscribe(req.user.userId, entityType, entityId);
  }
}
