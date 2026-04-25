import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite, FavoriteEntityType } from './favorite.entity';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite)
    private readonly repo: Repository<Favorite>,
  ) {}

  async findByUser(userId: number): Promise<Favorite[]> {
    return this.repo.find({ where: { user: { id: userId } }, relations: ['user'] });
  }

  async add(userId: number, entityType: FavoriteEntityType, entityId: number): Promise<Favorite> {
    const existing = await this.repo.findOne({
      where: { user: { id: userId }, entityType, entityId },
    });
    if (existing) return existing;
    const favorite = this.repo.create({ user: { id: userId } as any, entityType, entityId });
    return this.repo.save(favorite);
  }

  async remove(userId: number, entityType: FavoriteEntityType, entityId: number): Promise<void> {
    await this.repo.delete({ user: { id: userId }, entityType, entityId });
  }
}
