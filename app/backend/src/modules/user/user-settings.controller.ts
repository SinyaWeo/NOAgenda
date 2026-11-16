import {
  Controller,
  Get,
  Post,
  Put,
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
  async getGeneral(@Request() req: any) {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safe } = user as any;
    return safe;
  }

  /** POST /user/settings/general — update name, language, timezone, theme, weekStart, defaultProjectId */
  @Post('settings/general')
  async updateGeneral(@Request() req: any, @Body() body: UpdateGeneralSettingsDto) {
    // Explicit pick: never pass the raw body (role, password, etc.) to update().
    const { name, language, timezone, theme, weekStart, defaultProjectId } = body;
    const user = await this.userService.update(req.user.userId, {
      name,
      language,
      timezone,
      theme,
      weekStart,
      defaultProjectId,
    });
    if (!user) throw new NotFoundException();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safe } = user as any;
    return safe;
  }

  /** POST /user/settings/email — change email address */
  // A wrong password here is bad INPUT (400), not a failed session: a 401 would make the
  // frontend treat it as "session expired" and sign the user out over a typo.
  @Post('settings/email')
  @UseGuards(NoApiTokenGuard)
  async updateEmail(@Request() req: any, @Body() body: UpdateEmailDto) {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    if (!(await verifyPassword(body.password, user.password))) throw new BadRequestException('Incorrect password');
    const existing = await this.userService.findByEmail(body.email);
    if (existing && existing.id !== user.id) throw new ConflictException('Email is already in use');
    if (body.email !== user.email) {
      // A new address is unverified until the owner clicks the emailed link.
      await this.userService.update(user.id, { email: body.email, isEmailConfirmed: false });
      void this.emailVerification
        .send({ id: user.id, email: body.email, username: user.username })
        .catch(() => undefined);
    }
    return { message: 'Email updated. Please check your inbox to verify the new address.' };
  }

  /** GET /user/settings/avatar — return avatar URL */
  @Get('settings/avatar')
  async getAvatar(@Request() req: any) {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    return { avatarUrl: user.avatarUrl ?? null };
  }

  /** PUT /user/settings/avatar/upload — upload a new avatar image */
  @Put('settings/avatar/upload')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req: any, file: Express.Multer.File, cb: (err: Error | null, name: string) => void) => {
          cb(null, `avatar-${req.user?.userId ?? 'unknown'}-${randomUUID()}${AVATAR_MIME_EXT[file.mimetype] ?? ''}`);
        },
      }),
      fileFilter: (_req: any, file: Express.Multer.File, cb: (err: Error | null, accept: boolean) => void) => {
        if (AVATAR_MIME_EXT[file.mimetype]) cb(null, true);
        else cb(new BadRequestException('Avatar must be a JPEG, PNG, GIF or WebP image'), false);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
    }),
  )
  async uploadAvatar(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
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
  @UseGuards(NoApiTokenGuard)
  async updatePassword(@Request() req: any, @Body() body: UpdatePasswordDto) {
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
  async exportData(@Request() req: any, @Res() res: Response) {
    const data = await this.account.exportData(req.user.userId);
    const day = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="noagenda-export-${day}.json"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(JSON.stringify(data, null, 2));
  }

  /** POST /user/deletion/request — schedule deletion after a grace period (password required). */
  @Post('deletion/request')
  @UseGuards(NoApiTokenGuard)
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  async requestDeletion(@Request() req: any, @Body() body: DeletionRequestDto) {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    if (!(await verifyPassword(body.password, user.password))) throw new BadRequestException('Incorrect password');
    const { scheduledAt } = await this.account.requestDeletion(user.id);
    return { message: 'Account deletion scheduled', scheduledAt, graceDays: this.account.graceDays };
  }

  /** POST /user/deletion/cancel — cancel a pending account deletion. */
  @Post('deletion/cancel')
  async cancelDeletion(@Request() req: any) {
    await this.account.cancelDeletion(req.user.userId);
    return { message: 'Account deletion cancelled' };
  }
}
