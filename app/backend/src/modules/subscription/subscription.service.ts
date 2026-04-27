import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionEntityType } from './subscription.entity';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly repo: Repository<Subscription>,
  ) {}

  async subscribe(userId: number, entityType: SubscriptionEntityType, entityId: number): Promise<Subscription> {
    const existing = await this.repo.findOne({ where: { userId, entityType, entityId } });
    if (existing) throw new ConflictException('Already subscribed');
    const entity = this.repo.create({ userId, entityType, entityId });
    return this.repo.save(entity);
  }

  async unsubscribe(userId: number, entityType: SubscriptionEntityType, entityId: number): Promise<void> {
    const existing = await this.repo.findOne({ where: { userId, entityType, entityId } });
    if (!existing) throw new NotFoundException('Subscription not found');
    await this.repo.delete(existing.id);
  }

  findAll(userId: number): Promise<Subscription[]> {
    return this.repo.find({ where: { userId } });
  }
}
