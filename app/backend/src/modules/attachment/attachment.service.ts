import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from './attachment.entity';

@Injectable()
export class AttachmentService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
  ) {}

  async findAll(nodeId?: number): Promise<Attachment[]> {
    const where = nodeId ? { node: { id: nodeId } } : {};
    return this.attachmentRepository.find({
      where,
      relations: { node: true, uploader: true },
      order: { createdAt: 'DESC' },
    });
  }

  /** Attachments uploaded by one user (database-side filter). */
  async findByUploader(userId: number): Promise<Attachment[]> {
    return this.attachmentRepository.find({
      where: { uploader: { id: userId } },
      relations: { node: true, uploader: true },
      order: { createdAt: 'DESC' },
    });
  }

  /** Total bytes the user has uploaded (for the storage quota). */
  async usedBytes(userId: number): Promise<number> {
    const row = await this.attachmentRepository
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.size), 0)', 'total')
      .where('a.uploaderId = :userId', { userId })
      .getRawOne();
    return Number(row?.total ?? 0);
  }

  async findById(id: number): Promise<Attachment | null> {
    return this.attachmentRepository.findOne({ where: { id }, relations: { node: true, uploader: true } });
  }

  async create(attachment: Partial<Attachment>): Promise<Attachment> {
    const newAttachment = this.attachmentRepository.create(attachment);
    return this.attachmentRepository.save(newAttachment);
  }

  async remove(id: number): Promise<void> {
    await this.attachmentRepository.delete(id);
  }
}
