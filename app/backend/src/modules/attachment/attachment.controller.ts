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
import { NodeService } from '../node/node.service';
import { DomainEvents } from '../../common/domain-events';
import { randomUUID } from 'crypto';
import { NotInDemoGuard } from '../../common/guards/not-in-demo.guard';
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
  /** Per-user tail of the upload queue (see {@link serializedFor}). */
  private readonly uploadChains = new Map<number, Promise<void>>();

  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly access: NodeAccessService,
    private readonly nodes: NodeService,
    private readonly events: DomainEvents,
  ) {}

  /** Record an upload or removal in the activity log only. Never throws. */
  private async audit(taskId: number | undefined, actorId: number, filename: string, added: boolean): Promise<void> {
    try {
      if (!taskId) return;
      const task = await this.nodes.findById(taskId);
      this.events.emit({
        name: 'task.attachment_changed',
        data: { taskId },
        nodeId: taskId,
        owner: task?.createdBy ?? null,
        actorId,
        title: task?.title ?? null,
        changes: { attachment: added ? { from: null, to: filename } : { from: filename, to: null } },
        auditOnly: true,
      });
    } catch {
      // the log must never affect the action
    }
  }

  /**
   * Reading: the uploader (it is their own file), or anyone who can read the task.
   * Changing: whoever may write the task. Someone who lost access to the project must not delete its files,
   * even ones they uploaded; the uploader only decides alone once the task is gone (trashed or purged).
   */
  private async assertCan(att: Attachment, userId: number, write: boolean): Promise<void> {
    const isUploader = att.uploader?.id === userId;
    if (att.node?.id) {
      if (write) return this.access.assertWrite(userId, att.node.id);
      if (isUploader) return;
      return this.access.assertRead(userId, att.node.id);
    }
    if (isUploader) return;
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
  @UseGuards(NotInDemoGuard, UploadPrecheckGuard)
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
    const userId = req.user.userId;
    const created = await this.serializedFor(userId, async () => {
      try {
        if (SNIFFABLE.has(file.mimetype) && (await sniffFile(file.path).catch(() => null)) !== file.mimetype) {
          throw new BadRequestException(
            `The file is not a valid ${file.mimetype} (its content does not match its type)`,
          );
        }
        if ((await this.attachmentService.usedBytes(userId)) + file.size > USER_QUOTA_BYTES) {
          throw new PayloadTooLargeException('Your storage quota is full: delete some attachments first');
        }
        return await this.attachmentService.create({
          filename: file.originalname,
          path: resolve(file.path),
          size: file.size,
          node: { id: taskId },
          uploader: { id: userId },
        });
      } catch (err) {
        // multer already wrote the file to disk; do not keep it.
        unlink(file.path, () => undefined);
        throw err;
      }
    });
    await this.audit(taskId, userId, file.originalname, true);
    return created;
  }

  /**
   * Runs `fn` after the user's previous upload finished its quota check and insert, so parallel uploads
   * cannot all pass the check before any of them is counted. One backend process per instance, so in-memory
   * is enough.
   */
  private async serializedFor<T>(userId: number, fn: () => Promise<T>): Promise<T> {
    const prev = this.uploadChains.get(userId) ?? Promise.resolve();
    const run = prev.then(fn, fn);
    const tail = run.then(
      () => undefined,
      () => undefined,
    );
    this.uploadChains.set(userId, tail);
    try {
      return await run;
    } finally {
      if (this.uploadChains.get(userId) === tail) this.uploadChains.delete(userId);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req: AuthRequest): Promise<void> {
    const attachment = await this.attachmentService.findById(id);
    if (!attachment) throw new NotFoundException();
    await this.assertCan(attachment, req.user.userId, true);
    const resolvedPath = resolve(attachment.path);
    await this.attachmentService.remove(id);
    await this.audit(attachment.node?.id, req.user.userId, attachment.filename, false);
    if (resolvedPath.startsWith(UPLOADS_DIR + '/')) unlink(resolvedPath, () => undefined);
  }
}
