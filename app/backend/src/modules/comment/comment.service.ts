import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  async findAll(taskId?: number): Promise<Comment[]> {
    const where = taskId ? { task: { id: taskId } } : {};
    return this.commentRepository.find({ where, relations: ['task', 'author'] });
  }

  async findById(id: number): Promise<Comment | null> {
    return this.commentRepository.findOne({ where: { id }, relations: ['task', 'author'] });
  }

  async create(comment: Partial<Comment>): Promise<Comment> {
    const newComment = this.commentRepository.create(comment);
    return this.commentRepository.save(newComment);
  }

  async update(id: number, data: Partial<Comment>): Promise<Comment | null> {
    await this.commentRepository.update(id, data);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.commentRepository.delete(id);
  }
}
