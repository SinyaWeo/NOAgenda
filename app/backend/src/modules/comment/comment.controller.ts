import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CommentService } from './comment.service';
import { Comment } from './comment.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  async findAll(): Promise<Comment[]> {
    return this.commentService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Comment | null> {
    return this.commentService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: Partial<Comment>): Promise<Comment> {
    return this.commentService.create(body);
  }
}
