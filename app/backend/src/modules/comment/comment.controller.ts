import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, NotFoundException, ForbiddenException, BadRequestException, Request } from '@nestjs/common';
import { CommentService } from './comment.service';
import { Comment } from './comment.entity';
import { AuthGuard } from '@nestjs/passport';
import { NodeAccessService } from '../node/node-access.service';

@Controller('comments')
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly access: NodeAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Query('taskId') taskId: number | undefined, @Request() req: any): Promise<Comment[]> {
    if (!taskId) throw new BadRequestException('taskId query parameter is required');
    await this.access.assertRead(req.user.userId, Number(taskId));
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
    if (typeof body?.content !== 'string' || !body.content.trim() || body.content.length > 10000) {
      throw new BadRequestException('content is required (max 10000 characters)');
    }
    const taskId = Number(body.taskId);
    if (!Number.isInteger(taskId) || taskId < 1) throw new BadRequestException('Invalid taskId');
    await this.access.assertWrite(req.user.userId, taskId);
    return this.commentService.create({
      content: body.content,
      node: { id: taskId } as any,
      author: { id: req.user.userId } as any,
    });
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() body: Partial<Comment>, @Request() req: any): Promise<Comment> {
    const comment = await this.commentService.findById(id);
    if (!comment) throw new NotFoundException();
    if (comment.author?.id !== req.user.userId) throw new ForbiddenException();
    // Only the content field may change
    if (typeof body?.content !== 'string' || !body.content.trim() || body.content.length > 10000) {
      throw new BadRequestException('content is required (max 10000 characters)');
    }
    const updated = await this.commentService.update(id, { content: body.content });
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
