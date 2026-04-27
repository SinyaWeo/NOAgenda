import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reaction } from './reaction.entity';

@Injectable()
export class ReactionService {
  constructor(
    @InjectRepository(Reaction)
    private readonly repo: Repository<Reaction>,
  ) {}

  findAll(entityType: string, entityId: number): Promise<Reaction[]> {
    return this.repo.find({ where: { entityType, entityId } });
  }

  async upsert(userId: number, entityType: string, entityId: number, reaction: string): Promise<Reaction> {
    let entity = await this.repo.findOne({ where: { userId, entityType, entityId, reaction } });
    if (!entity) {
      entity = this.repo.create({ userId, entityType, entityId, reaction });
    }
    return this.repo.save(entity);
  }

  async remove(userId: number, entityType: string, entityId: number, reaction: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { userId, entityType, entityId, reaction } });
    if (!entity) throw new NotFoundException();
    await this.repo.delete(entity.id);
  }
}
