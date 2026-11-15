import { Controller, Get, Post, Delete, Body, Param, Query, Res, UploadedFile, UseInterceptors, UseGuards, Request, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AttachmentService } from './attachment.service';
import { AuthGuard } from '@nestjs/passport';
import { Attachment } from './attachment.entity';
import { diskStorage } from 'multer';
import { extname, resolve, basename } from 'path';
import { existsSync, unlink } from 'fs';
import { NodeAccessService } from '../node/node-access.service';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = resolve(process.cwd(), 'uploads');

// Allowed MIME types for attachments
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-zip-compressed',
  'application/json',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Controller('attachments')
export class AttachmentController {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly access: NodeAccessService,
  ) {}

  /** Uploader, or anyone with the given access on the attachment's task. */
  private async assertCan(att: Attachment, userId: number, write: boolean): Promise<void> {
    if (att.uploader?.id === userId) return;
    if (att.node?.id) {
      return write
        ? this.access.assertWrite(userId, att.node.id)
        : this.access.assertRead(userId, att.node.id);
    }
    throw new ForbiddenException();
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Query('taskId') taskId?: number, @Request() req?: any): Promise<Attachment[]> {
    if (taskId) {
      // Everyone who can read the task may list its attachments.
      await this.access.assertRead(req.user.userId, Number(taskId));
      return this.attachmentService.findAll(Number(taskId));
    }
    // Without a task, only the caller's own uploads.
    const results = await this.attachmentService.findAll();
    return results.filter((a) => a.uploader?.id === req.user.userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: number, @Request() req: any): Promise<Attachment> {
    const attachment = await this.attachmentService.findById(id);
    if (!attachment) throw new NotFoundException();
    await this.assertCan(attachment, req.user.userId, false);
    return attachment;
  }

  @Get(':id/download')
  @UseGuards(AuthGuard('jwt'))
  async download(@Param('id') id: number, @Res() res: Response, @Request() req: any): Promise<void> {
    const attachment = await this.attachmentService.findById(id);
    if (!attachment) throw new NotFoundException();
    await this.assertCan(attachment, req.user.userId, false);

    // Prevent path traversal: resolve the stored path relative to the uploads directory
    const resolvedPath = resolve(attachment.path);
    if (!resolvedPath.startsWith(UPLOADS_DIR + '/') && resolvedPath !== UPLOADS_DIR) {
      throw new BadRequestException('Invalid file path');
    }
    if (!existsSync(resolvedPath)) throw new NotFoundException('File not found on disk');

    // Sanitize filename to prevent header injection (strip non-ASCII and special chars)
    const safeFilename = basename(attachment.filename).replace(/[^\w.\-]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(resolvedPath);
  }

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (_req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        // Unguessable server-side name; keep only a sanitized extension.
        const ext = extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
        cb(null, randomUUID() + ext);
      },
    }),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req: any, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
      if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`File type '${file.mimetype}' is not allowed`), false);
      }
    },
  }))
  async upload(@UploadedFile() file: Express.Multer.File, @Body() body: any, @Request() req: any): Promise<Attachment> {
    if (!file) throw new BadRequestException('No file uploaded');
    const taskId = body?.taskId ? Number(body.taskId) : undefined;
    try {
      if (taskId !== undefined) {
        if (!Number.isInteger(taskId) || taskId < 1) throw new BadRequestException('Invalid taskId');
        await this.access.assertWrite(req.user.userId, taskId);
      }
    } catch (err) {
      // multer already wrote the file to disk; do not keep it.
      unlink(file.path, () => undefined);
      throw err;
    }
    return this.attachmentService.create({
      filename: file.originalname,
      path: resolve(file.path),
      node: taskId !== undefined ? { id: taskId } as any : undefined,
      uploader: { id: req.user.userId } as any,
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: number, @Request() req: any): Promise<void> {
    const attachment = await this.attachmentService.findById(id);
    if (!attachment) throw new NotFoundException();
    await this.assertCan(attachment, req.user.userId, true);
    const resolvedPath = resolve(attachment.path);
    await this.attachmentService.remove(id);
    if (resolvedPath.startsWith(UPLOADS_DIR + '/')) unlink(resolvedPath, () => undefined);
  }
}
