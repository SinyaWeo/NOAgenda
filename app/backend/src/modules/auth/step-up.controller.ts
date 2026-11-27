import type { AuthRequest } from '../../common/auth-user';
import { Body, Controller, HttpCode, HttpStatus, Post, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { StepUpDto } from './dto/step-up.dto';

/**
 * Step-up login for admin changes (see StepUpGuard). Not under /auth/: those routes are public, and the
 * frontend never refreshes an expired access token for them.
 */
@Controller('user/step-up')
export class StepUpController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async stepUp(@Body() body: StepUpDto, @Request() req: AuthRequest): Promise<{ elevatedUntil: Date }> {
    return this.authService.stepUp(req.user, { password: body.password, code: body.code }, req.ip);
  }
}
