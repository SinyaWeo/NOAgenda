import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, NotFoundException, ForbiddenException, BadRequestException, Request } from '@nestjs/common';
import { CommentService } from './comment.service';
import { Comment } from './comment.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Query('taskId') taskId?: number): Promise<Comment[]> {
    if (!taskId) throw new BadRequestException('taskId query parameter is required');
    return this.commentService.findAll(Number(taskId));
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: number, @Request() req: any): Promise<Comment> {
    const comment = await this.commentService.findById(id);
    if (!comment) throw new NotFoundException();
    // Only the comment author may fetch a single comment by ID
    if (comment.author?.id !== req.user.userId) throw new ForbiddenException();
    return comment;
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Body() body: { content: string; taskId: number },
    @Request() req: any,
  ): Promise<Comment> {
    return this.commentService.create({
      content: body.content,
      node: { id: body.taskId } as any,
      author: { id: req.user.userId } as any,
    });
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Comment>, @Request() req: any): Promise<Comment> {
    const comment = await this.commentService.findById(id);
    if (!comment) throw new NotFoundException();
    if (comment.author?.id !== req.user.userId) throw new ForbiddenException();
    // Only allow updating the content field
    const { id: _id, author: _a, node: _n, ...safeBody } = body as any;
    const updated = await this.commentService.update(id, safeBody);
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const comment = await this.commentService.findById(id);
    if (!comment) throw new NotFoundException();
    if (comment.author?.id !== req.user.userId) throw new ForbiddenException();
    return this.commentService.remove(id);
  }
}
