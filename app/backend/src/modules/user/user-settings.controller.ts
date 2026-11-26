import { omit } from '../../common/omit';
import type { AuthRequest } from '../../common/auth-user';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  HttpCode,
  Body,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { unlink } from 'fs';
import { basename, resolve, sep } from 'path';

/** Where avatar files live (the multer destination below is relative to the working directory). */
/** Account-deletion requests per hour per IP (the password is checked each time). Raised only for automated tests. */
const deletionRequestLimit = Number(process.env.DELETION_REQUEST_LIMIT || 5);
const AVATARS_DIR = resolve(process.cwd(), 'uploads', 'avatars');

const AVATAR_MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};
import { verifyPassword } from '../../common/password';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { SessionService } from '../session/session.service';
import { NoApiTokenGuard } from '../auth/no-api-token.guard';
import { NotInDemoGuard } from '../../common/guards/not-in-demo.guard';
import {
  UpdateGeneralSettingsDto,
  UpdateEmailDto,
  UpdatePasswordDto,
  DeletionRequestDto,
} from './dto/user-settings.dto';
import { sniffFile } from '../../common/file-sniff';
import { AccountService } from '../account/account.service';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';

@Controller('user')
export class UserSettingsController {
  constructor(
    private readonly userService: UserService,
    private readonly emailVerification: EmailVerificationService,
    private readonly sessions: SessionService,
    private readonly account: AccountService,
  ) {}

  /** GET /user/settings/general — return current user profile */
  @Get('settings/general')
  async getGeneral(@Request() req: AuthRequest) {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    return omit(user, 'password');
  }

  /** POST /user/settings/general — update name, language, timezone, theme */
  @Post('settings/general')
  async updateGeneral(@Request() req: AuthRequest, @Body() body: UpdateGeneralSettingsDto) {
    // Explicit pick: never pass the raw body (role, password, etc.) to update().
    const { name, language, timezone, theme } = body;
    const user = await this.userService.update(req.user.userId, {
      name,
      language,
      timezone,
      theme,
    });
    if (!user) throw new NotFoundException();
    return omit(user, 'password');
  }

  /** GET /user/settings/email — the current address and one waiting for confirmation, if any */
  @Get('settings/email')
  async getEmail(@Request() req: AuthRequest): Promise<{ email: string; pendingEmail: string | null }> {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    return { email: user.email, pendingEmail: await this.emailVerification.pendingEmail(user) };
  }

  /**
   * POST /user/settings/email — change email address. The new address takes effect only once the
   * link sent to it is opened (unless mail cannot be delivered at all); until then everything keeps
   * going to the current one. Asking for the current address cancels a pending change.
   */
  // A wrong password here is bad INPUT (400), not a failed session: a 401 would make the
  // frontend treat it as "session expired" and sign the user out over a typo.
  @Post('settings/email')
  @UseGuards(NoApiTokenGuard, NotInDemoGuard)
  async updateEmail(
    @Request() req: AuthRequest,
    @Body() body: UpdateEmailDto,
  ): Promise<{ pendingEmail: string | null }> {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    if (!(await verifyPassword(body.password, user.password))) throw new BadRequestException('Incorrect password');
    if (body.email === user.email) {
      await this.emailVerification.cancelChange(user);
      return { pendingEmail: null };
    }
    const existing = await this.userService.findByEmail(body.email);
    if (existing && existing.id !== user.id) throw new ConflictException('Email is already in use');
    const pending = await this.emailVerification.requestChange(user, body.email);
    return { pendingEmail: pending ? body.email : null };
  }

  /** DELETE /user/settings/email/pending — withdraw an address change that is not confirmed yet */
  @Delete('settings/email/pending')
  @UseGuards(NoApiTokenGuard)
  @HttpCode(204)
  async cancelEmailChange(@Request() req: AuthRequest): Promise<void> {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    await this.emailVerification.cancelChange(user);
  }

  /** GET /user/settings/avatar — return avatar URL */
  @Get('settings/avatar')
  async getAvatar(@Request() req: AuthRequest) {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    return { avatarUrl: user.avatarUrl ?? null };
  }

  /** PUT /user/settings/avatar/upload — upload a new avatar image */
  @Put('settings/avatar/upload')
  @UseGuards(NotInDemoGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req: AuthRequest, file: Express.Multer.File, cb: (err: Error | null, name: string) => void) => {
          cb(null, `avatar-${req.user?.userId ?? 'unknown'}-${randomUUID()}${AVATAR_MIME_EXT[file.mimetype] ?? ''}`);
        },
      }),
      fileFilter: (_req: AuthRequest, file: Express.Multer.File, cb: (err: Error | null, accept: boolean) => void) => {
        if (AVATAR_MIME_EXT[file.mimetype]) cb(null, true);
        else cb(new BadRequestException('Avatar must be a JPEG, PNG, GIF or WebP image'), false);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
    }),
  )
  async uploadAvatar(@Request() req: AuthRequest, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    // multer trusted the Content-Type header; check what was actually written to disk.
    if ((await sniffFile(file.path).catch(() => null)) !== file.mimetype) {
      unlink(file.path, () => undefined);
      throw new BadRequestException('The file is not a valid JPEG, PNG, GIF or WebP image');
    }
    const previous = (await this.userService.findByIdSafe(req.user.userId))?.avatarUrl;
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    await this.userService.update(req.user.userId, { avatarUrl });
    // Only the newest avatar is kept: remove the file it replaces (never anything outside avatars/).
    if (previous && previous !== avatarUrl) {
      const old = resolve(AVATARS_DIR, basename(previous));
      if (old.startsWith(AVATARS_DIR + sep)) unlink(old, () => undefined);
    }
    return { avatarUrl };
  }

  /** POST /user/settings/password — change password */
  @Post('settings/password')
  @UseGuards(NoApiTokenGuard, NotInDemoGuard)
  async updatePassword(@Request() req: AuthRequest, @Body() body: UpdatePasswordDto) {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    if (!(await verifyPassword(body.oldPassword, user.password)))
      throw new BadRequestException('Incorrect current password');
    await this.userService.update(req.user.userId, { password: body.newPassword });
    // Everyone else (including a thief holding an old session) is signed out; this session stays.
    await this.sessions.revokeAllForUser(req.user.userId, req.user.sessionId);
    return { message: 'Password updated successfully' };
  }

  /** GET /user/export — download everything we store about you as JSON. */
  @Get('export')
  @UseGuards(NoApiTokenGuard)
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  async exportData(@Request() req: AuthRequest, @Res() res: Response) {
    const data = await this.account.exportData(req.user.userId);
    const day = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="noagenda-export-${day}.json"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(JSON.stringify(data, null, 2));
  }

  /** POST /user/deletion/request — schedule deletion after a grace period (password required). */
  @Post('deletion/request')
  @UseGuards(NoApiTokenGuard, NotInDemoGuard)
  @Throttle({ default: { ttl: 3600000, limit: deletionRequestLimit } })
  async requestDeletion(@Request() req: AuthRequest, @Body() body: DeletionRequestDto) {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    if (!(await verifyPassword(body.password, user.password))) throw new BadRequestException('Incorrect password');
    const { scheduledAt } = await this.account.requestDeletion(user.id);
    return { message: 'Account deletion scheduled', scheduledAt, graceDays: this.account.graceDays };
  }

  /** POST /user/deletion/cancel — cancel a pending account deletion. */
  @Post('deletion/cancel')
  async cancelDeletion(@Request() req: AuthRequest) {
    await this.account.cancelDeletion(req.user.userId);
    return { message: 'Account deletion cancelled' };
  }
}
