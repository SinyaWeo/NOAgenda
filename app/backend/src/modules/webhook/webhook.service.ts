import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Webhook } from './webhook.entity';

@Injectable()
export class WebhookService {
  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepository: Repository<Webhook>,
  ) {}

  async findAll(filter?: { projectId?: number; userId?: number }): Promise<Webhook[]> {
    const where: FindOptionsWhere<Webhook> = {};
    if (filter?.projectId !== undefined) where.projectId = filter.projectId;
    if (filter?.userId !== undefined) where.userId = filter.userId;
    return this.webhookRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: number): Promise<Webhook | null> {
    return this.webhookRepository.findOne({ where: { id } });
  }

  async create(data: Partial<Webhook>): Promise<Webhook> {
    const webhook = this.webhookRepository.create(data);
    return this.webhookRepository.save(webhook);
  }

  async update(id: number, data: Partial<Webhook>): Promise<Webhook | null> {
    await this.webhookRepository.update(id, data as QueryDeepPartialEntity<Webhook>);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.webhookRepository.delete(id);
  }
}
