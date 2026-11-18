import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanbanBucket } from './kanban-bucket.entity';

/** Fields a client must never control (identity / which project or view it belongs to). */
function clean(data: Partial<KanbanBucket>): Partial<KanbanBucket> {
  const { id: _i, projectId: _p, viewId: _v, createdAt: _c, updatedAt: _u, ...rest } = data ?? {};
  return rest;
}

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

  async create(projectId: number, viewId: number, data: Partial<KanbanBucket>): Promise<KanbanBucket> {
    // The view in the URL must be one of this project's, or a project admin could attach buckets to another project's view.
    const rows: unknown[] = await this.repo.manager.query(
      'SELECT 1 FROM project_views WHERE id = ? AND projectId = ?',
      [viewId, projectId],
    );
    if (!rows.length) throw new NotFoundException();
    const entity = this.repo.create({ ...clean(data), projectId, viewId });
    return this.repo.save(entity);
  }

  async update(id: number, projectId: number, viewId: number, data: Partial<KanbanBucket>): Promise<KanbanBucket> {
    await this.findOne(id, projectId, viewId);
    await this.repo.update(id, clean(data));
    return this.findOne(id, projectId, viewId);
  }

  async remove(id: number, projectId: number, viewId: number): Promise<void> {
    await this.findOne(id, projectId, viewId);
    await this.repo.delete(id);
  }
}
