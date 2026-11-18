import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { UploadRequest } from '../../common/auth-user';
import { NodeAccessService } from '../node/node-access.service';
import { AttachmentService } from './attachment.service';

/** Largest single attachment (10 MB) and the per-user allowance (USER_STORAGE_QUOTA_MB, default 200 MB). */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const USER_QUOTA_BYTES = Number(process.env.USER_STORAGE_QUOTA_MB || 200) * 1024 * 1024;

/**
 * Runs BEFORE multer, so an upload the caller may not make is refused without a byte reaching the disk.
 * The task id has to come in the query string (`POST /attachments/upload?taskId=7`) because a multipart
 * body field is only readable after multer has already written the file. The controller keeps its own
 * checks (content sniffing, exact quota) as the final word.
 */
@Injectable()
export class UploadPrecheckGuard implements CanActivate {
  constructor(
    private readonly access: NodeAccessService,
    private readonly attachments: AttachmentService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<UploadRequest>();
    const raw = req.query?.taskId;
    const taskId = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isSafeInteger(taskId) || taskId < 1) {
      throw new BadRequestException('taskId is required as a query parameter');
    }
    await this.access.assertWrite(req.user.userId, taskId);

    // Content-Length covers the whole multipart body (a little more than the file), so this is a cheap
    // upper bound; a missing or bogus value is left to multer's own size limit.
    const length = Number(req.headers?.['content-length']);
    if (Number.isFinite(length) && length > 0) {
      if (length > MAX_FILE_SIZE + 64 * 1024) throw new PayloadTooLargeException('File too large (10 MB maximum)');
      if ((await this.attachments.usedBytes(req.user.userId)) + length > USER_QUOTA_BYTES + 64 * 1024) {
        throw new PayloadTooLargeException('Your storage quota is full: delete some attachments first');
      }
    }
    req.uploadTaskId = taskId;
    return true;
  }
}
