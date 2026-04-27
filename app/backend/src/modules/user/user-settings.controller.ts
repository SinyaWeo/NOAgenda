import {
  Controller, Get, Post, Put, Body, UseGuards, Request,
  NotFoundException, UnauthorizedException, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as bcrypt from 'bcryptjs';

@Controller('user')
@UseGuards(AuthGuard('jwt'))
export class UserSettingsController {
  constructor(private readonly userService: UserService) {}

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
  async updateGeneral(
    @Request() req: any,
    @Body() body: {
      name?: string;
      language?: string;
      timezone?: string;
      theme?: string;
      weekStart?: number;
      defaultProjectId?: number;
    },
  ) {
    const user = await this.userService.update(req.user.userId, body);
    if (!user) throw new NotFoundException();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safe } = user as any;
    return safe;
  }

  /** POST /user/settings/email — change email address */
  @Post('settings/email')
  async updateEmail(@Request() req: any, @Body() body: { email: string; password: string }) {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    const valid = await bcrypt.compare(body.password, user.password);
    if (!valid) throw new UnauthorizedException('Incorrect password');
    await this.userService.update(req.user.userId, { email: body.email });
    return { message: 'Email updated successfully' };
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
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req: any, file: Express.Multer.File, cb: (err: Error | null, name: string) => void) => {
        cb(null, `avatar-${req.user?.userId ?? 'unknown'}-${Date.now()}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  }))
  async uploadAvatar(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    await this.userService.update(req.user.userId, { avatarUrl });
    return { avatarUrl };
  }

  /** POST /user/settings/password — change password */
  @Post('settings/password')
  async updatePassword(@Request() req: any, @Body() body: { oldPassword: string; newPassword: string }) {
    const user = await this.userService.findById(req.user.userId);
    if (!user) throw new NotFoundException();
    const valid = await bcrypt.compare(body.oldPassword, user.password);
    if (!valid) throw new UnauthorizedException('Incorrect current password');
    await this.userService.update(req.user.userId, { password: body.newPassword });
    return { message: 'Password updated successfully' };
  }

  /** POST /user/export/request — request a data export */
  @Post('export/request')
  async requestExport(@Request() req: any) {
    return { message: 'Data export requested. You will be notified when it is ready.' };
  }

  /** POST /user/deletion/request — request account deletion (7-day grace period) */
  @Post('deletion/request')
  async requestDeletion(@Request() req: any) {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 7);
    await this.userService.update(req.user.userId, {
      isDeletionRequested: true,
      deletionScheduledAt: scheduledAt,
    });
    return { message: 'Account deletion scheduled', scheduledAt };
  }

  /** POST /user/deletion/cancel — cancel pending account deletion */
  @Post('deletion/cancel')
  async cancelDeletion(@Request() req: any) {
    await this.userService.update(req.user.userId, {
      isDeletionRequested: false,
      deletionScheduledAt: undefined,
    });
    return { message: 'Account deletion cancelled' };
  }
}

