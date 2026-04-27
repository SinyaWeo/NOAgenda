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

  async findAll(taskId?: number): Promise<Attachment[]> {
    const where = taskId ? { task: { id: taskId } } : {};
    return this.attachmentRepository.find({ where, relations: ['task', 'uploader'], order: { createdAt: 'DESC' } });
  }

  async findById(id: number): Promise<Attachment | null> {
    return this.attachmentRepository.findOne({ where: { id }, relations: ['task', 'uploader'] });
  }

  async create(attachment: Partial<Attachment>): Promise<Attachment> {
    const newAttachment = this.attachmentRepository.create(attachment);
    return this.attachmentRepository.save(newAttachment);
  }

  async remove(id: number): Promise<void> {
    await this.attachmentRepository.delete(id);
  }
}
