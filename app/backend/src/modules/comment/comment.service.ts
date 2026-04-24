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

  async findAll(): Promise<Comment[]> {
    return this.commentRepository.find({ relations: ['task', 'author'] });
  }

  async findById(id: number): Promise<Comment | null> {
    return this.commentRepository.findOne({ where: { id }, relations: ['task', 'author'] });
  }

  async create(comment: Partial<Comment>): Promise<Comment> {
    const newComment = this.commentRepository.create(comment);
    return this.commentRepository.save(newComment);
  }
}
