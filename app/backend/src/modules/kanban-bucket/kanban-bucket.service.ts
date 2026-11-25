import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanbanBucket } from './kanban-bucket.entity';
import { Node } from '../node/node.entity';

/** Fields a client must never control (identity / which project it belongs to). */
function clean(data: Partial<KanbanBucket>): Partial<KanbanBucket> {
  const { id: _i, projectId: _p, createdAt: _c, updatedAt: _u, ...rest } = data ?? {};
  return rest;
}

export const LAST_OF_STATUS = 'A project needs at least one bucket for each status';

@Injectable()
export class KanbanBucketService {
  constructor(
    @InjectRepository(KanbanBucket)
    private readonly repo: Repository<KanbanBucket>,
  ) {}

  findAll(projectId: number): Promise<KanbanBucket[]> {
    return this.repo.find({ where: { projectId }, order: { position: 'ASC', id: 'ASC' } });
  }

  async findOne(id: number, projectId: number): Promise<KanbanBucket> {
    const bucket = await this.repo.findOne({ where: { id, projectId } });
    if (!bucket) throw new NotFoundException();
    return bucket;
  }

  async create(projectId: number, data: Partial<KanbanBucket>): Promise<KanbanBucket> {
    const fields = clean(data);
    if (fields.position === undefined) {
      const last = await this.repo.findOne({ where: { projectId }, order: { position: 'DESC' } });
      fields.position = last ? last.position + 1 : 0;
    }
    return this.repo.save(this.repo.create({ ...fields, projectId }));
  }

  async update(id: number, projectId: number, data: Partial<KanbanBucket>): Promise<KanbanBucket> {
    const bucket = await this.findOne(id, projectId);
    const fields = clean(data);
    const statusChanged = fields.status !== undefined && fields.status !== bucket.status;
    if (statusChanged) await this.assertNotLastOfStatus(bucket);
    await this.repo.update(id, fields);
    if (statusChanged) {
      // Its tasks keep their status: they drop back to the first bucket of that status.
      await this.repo.manager
        .createQueryBuilder()
        .update(Node)
        .set({ bucketId: null })
        .where('bucketId = :id AND (status IS NULL OR status <> :status)', { id, status: fields.status })
        .execute();
    }
    return this.findOne(id, projectId);
  }

  async remove(id: number, projectId: number): Promise<void> {
    const bucket = await this.findOne(id, projectId);
    await this.assertNotLastOfStatus(bucket);
    await this.repo.delete(id); // its tasks lose bucketId (ON DELETE SET NULL)
  }

  /** Every status must keep a column, or tasks with it would have nowhere to show on the board. */
  private async assertNotLastOfStatus(bucket: KanbanBucket): Promise<void> {
    const same = await this.repo.count({ where: { projectId: bucket.projectId, status: bucket.status } });
    if (same <= 1) throw new BadRequestException(LAST_OF_STATUS);
  }
}
