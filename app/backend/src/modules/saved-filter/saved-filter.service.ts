import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedFilter } from './saved-filter.entity';

/** Fields a client must never control (identity / ownership). */
function clean(data: Partial<SavedFilter>): Partial<SavedFilter> {
  const { id: _i, userId: _u, createdAt: _c, updatedAt: _up, ...rest } = (data ?? {}) as any;
  return rest;
}

@Injectable()
export class SavedFilterService {
  constructor(
    @InjectRepository(SavedFilter)
    private readonly repo: Repository<SavedFilter>,
  ) {}

  findAll(userId: number): Promise<SavedFilter[]> {
    return this.repo.find({ where: { userId } });
  }

  async findOne(id: number, userId: number): Promise<SavedFilter> {
    const filter = await this.repo.findOne({ where: { id, userId } });
    if (!filter) throw new NotFoundException();
    return filter;
  }

  create(userId: number, data: Partial<SavedFilter>): Promise<SavedFilter> {
    const entity = this.repo.create({ ...clean(data), userId });
    return this.repo.save(entity);
  }

  async update(id: number, userId: number, data: Partial<SavedFilter>): Promise<SavedFilter> {
    await this.findOne(id, userId);
    await this.repo.update(id, clean(data));
    return this.findOne(id, userId);
  }

  async remove(id: number, userId: number): Promise<void> {
    await this.findOne(id, userId);
    await this.repo.delete(id);
  }
}
