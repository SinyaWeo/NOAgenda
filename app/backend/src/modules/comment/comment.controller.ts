import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { Comment } from './comment.entity';
import { NodeAccessService } from '../node/node-access.service';
import { TaskService } from '../task/task.service';
import { TaskAssigneeService } from '../task-assignee/task-assignee.service';
import { NotificationService } from '../notification/notification.service';
import { DomainEvents } from '../../common/domain-events';

@Controller('comments')
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly access: NodeAccessService,
    private readonly tasks: TaskService,
    private readonly assignees: TaskAssigneeService,
    private readonly notifications: NotificationService,
    private readonly events: DomainEvents,
  ) {}

  @Get()
  async findAll(@Query('taskId') taskId: number | undefined, @Request() req: any): Promise<Comment[]> {
    if (!taskId) throw new BadRequestException('taskId query parameter is required');
    await this.access.assertRead(req.user.userId, Number(taskId));
    return this.commentService.findAll(Number(taskId));
  }

  @Get(':id')
  async findById(@Param('id') id: number, @Request() req: any): Promise<Comment> {
    const comment = await this.commentService.findById(id);
    if (!comment) throw new NotFoundException();
    // Only the comment author may fetch a single comment by ID
    if (comment.author?.id !== req.user.userId) throw new ForbiddenException();
    return comment;
  }

  @Post()
  async create(@Body() body: { content: string; taskId: number }, @Request() req: any): Promise<Comment> {
    if (typeof body?.content !== 'string' || !body.content.trim() || body.content.length > 10000) {
      throw new BadRequestException('content is required (max 10000 characters)');
    }
    const taskId = Number(body.taskId);
    if (!Number.isInteger(taskId) || taskId < 1) throw new BadRequestException('Invalid taskId');
    await this.access.assertWrite(req.user.userId, taskId);
    const comment = await this.commentService.create({
      content: body.content,
      node: { id: taskId } as any,
      author: { id: req.user.userId } as any,
    });
    void this.notifyAboutComment(taskId, req.user, comment);
    return comment;
  }

  /** Announces the new comment to webhooks, and tells the task's creator and assignees (not the commenter). Never throws. */
  private async notifyAboutComment(
    taskId: number,
    actor: { userId: number; username: string },
    comment: Comment,
  ): Promise<void> {
    try {
      const task = await this.tasks.findById(taskId);
      if (!task) return;
      this.events.emit({
        name: 'comment.created',
        data: {
          id: comment.id,
          content: comment.content,
          taskId,
          authorId: actor.userId,
          createdAt: comment.createdAt,
        },
        nodeId: taskId,
        owner: task.createdBy ?? null,
      });
      const assigned = await this.assignees.findByTask(taskId);
      await this.notifications.notify({
        type: 'task_comment',
        recipients: [task.createdBy, ...assigned.map((a) => a.user?.id)],
        actorId: actor.userId,
        actorName: actor.username,
        nodeId: taskId,
        kind: 'task',
        title: task.title ?? '',
      });
    } catch {
      // a notification problem must never affect the comment
    }
  }

  @Put(':id')
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
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const comment = await this.commentService.findById(id);
    if (!comment) throw new NotFoundException();
    if (comment.author?.id !== req.user.userId) throw new ForbiddenException();
    return this.commentService.remove(id);
  }
}
