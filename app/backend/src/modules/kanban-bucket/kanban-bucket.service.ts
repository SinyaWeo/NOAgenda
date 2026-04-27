import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanbanBucket } from './kanban-bucket.entity';

@Injectable()
export class KanbanBucketService {
  constructor(
    @InjectRepository(KanbanBucket)
    private readonly repo: Repository<KanbanBucket>,
  ) {}

  findAll(projectId: number, viewId: number): Promise<KanbanBucket[]> {
    return this.repo.find({ where: { projectId, viewId }, order: { position: 'ASC' } });
  }

  async findOne(id: number, projectId: number, viewId: number): Promise<KanbanBucket> {
    const bucket = await this.repo.findOne({ where: { id, projectId, viewId } });
    if (!bucket) throw new NotFoundException();
    return bucket;
  }

  create(projectId: number, viewId: number, data: Partial<KanbanBucket>): Promise<KanbanBucket> {
    const entity = this.repo.create({ ...data, projectId, viewId });
    return this.repo.save(entity);
  }

  async update(id: number, projectId: number, viewId: number, data: Partial<KanbanBucket>): Promise<KanbanBucket> {
    await this.findOne(id, projectId, viewId);
    await this.repo.update(id, data);
    return this.findOne(id, projectId, viewId);
  }

  async remove(id: number, projectId: number, viewId: number): Promise<void> {
    await this.findOne(id, projectId, viewId);
    await this.repo.delete(id);
  }
}
