import type { AuthRequest, UploadRequest } from '../../common/auth-user';
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AttachmentService } from './attachment.service';
import { Attachment } from './attachment.entity';
import { diskStorage } from 'multer';
import { extname, resolve, basename } from 'path';
import { existsSync, unlink } from 'fs';
import { NodeAccessService } from '../node/node-access.service';
import { randomUUID } from 'crypto';
import { sniffFile } from '../../common/file-sniff';
import { MAX_FILE_SIZE, UploadPrecheckGuard, USER_QUOTA_BYTES } from './upload-precheck.guard';

const UPLOADS_DIR = resolve(process.cwd(), 'uploads');

// Allowed MIME types for attachments
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'application/json',
];
/** Declared types whose content we can verify from the first bytes. */
const SNIFFABLE = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']);

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
      return write ? this.access.assertWrite(userId, att.node.id) : this.access.assertRead(userId, att.node.id);
    }
    throw new ForbiddenException();
  }

  @Get()
  async findAll(@Query('taskId') taskId: number | undefined, @Request() req: AuthRequest): Promise<Attachment[]> {
    if (taskId) {
      // Everyone who can read the task may list its attachments.
      await this.access.assertRead(req.user.userId, Number(taskId));
      return this.attachmentService.findAll(Number(taskId));
    }
    // Without a task, only the caller's own uploads.
    return this.attachmentService.findByUploader(req.user.userId);
  }

  @Get(':id')
  async findById(@Param('id') id: number, @Request() req: AuthRequest): Promise<Attachment> {
    const attachment = await this.attachmentService.findById(id);
    if (!attachment) throw new NotFoundException();
    await this.assertCan(attachment, req.user.userId, false);
    return attachment;
  }

  @Get(':id/download')
  async download(@Param('id') id: number, @Res() res: Response, @Request() req: AuthRequest): Promise<void> {
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
    const safeFilename = basename(attachment.filename).replace(/[^\w.-]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(resolvedPath);
  }

  @Post('upload')
  @UseGuards(UploadPrecheckGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (
          _req: AuthRequest,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          // Unguessable server-side name; keep only a sanitized extension.
          const ext = extname(file.originalname)
            .toLowerCase()
            .replace(/[^.a-z0-9]/g, '')
            .slice(0, 10);
          cb(null, randomUUID() + ext);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (
        _req: AuthRequest,
        file: Express.Multer.File,
        cb: (error: Error | null, accept: boolean) => void,
      ) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type '${file.mimetype}' is not allowed`), false);
        }
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Request() req: UploadRequest): Promise<Attachment> {
    if (!file) throw new BadRequestException('No file uploaded');
    // UploadPrecheckGuard has already validated this id and the caller's write access, before multer ran.
    const taskId = req.uploadTaskId as number;
    try {
      if (SNIFFABLE.has(file.mimetype) && (await sniffFile(file.path).catch(() => null)) !== file.mimetype) {
        throw new BadRequestException(`The file is not a valid ${file.mimetype} (its content does not match its type)`);
      }
      if ((await this.attachmentService.usedBytes(req.user.userId)) + file.size > USER_QUOTA_BYTES) {
        throw new PayloadTooLargeException('Your storage quota is full: delete some attachments first');
      }
    } catch (err) {
      // multer already wrote the file to disk; do not keep it.
      unlink(file.path, () => undefined);
      throw err;
    }
    return this.attachmentService.create({
      filename: file.originalname,
      path: resolve(file.path),
      size: file.size,
      node: { id: taskId },
      uploader: { id: req.user.userId },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    const attachment = await this.attachmentService.findById(id);
    if (!attachment) throw new NotFoundException();
    await this.assertCan(attachment, req.user.userId, true);
    const resolvedPath = resolve(attachment.path);
    await this.attachmentService.remove(id);
    if (resolvedPath.startsWith(UPLOADS_DIR + '/')) unlink(resolvedPath, () => undefined);
  }
}
