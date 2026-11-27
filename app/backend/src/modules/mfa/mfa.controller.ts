import type { AuthRequest } from '../../common/auth-user';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { NoApiTokenGuard } from '../auth/no-api-token.guard';
import { NotInDemoGuard } from '../../common/guards/not-in-demo.guard';
import { AllowWithoutMfa } from '../../common/decorators/allow-without-mfa.decorator';
import { MfaService, MfaStatus } from './mfa.service';
import { MfaCodeDto, MfaDisableDto, MfaSetupDto } from './dto/mfa.dto';

/**
 * The signed-in user's own two-factor authentication. Interactive sessions only (no API tokens), off on the
 * demo (its accounts are shared: one visitor must not lock the others out), and reachable while the
 * account still has to set 2FA up (that is what these routes are for).
 */
@Controller('user/mfa')
@UseGuards(NoApiTokenGuard)
@AllowWithoutMfa()
@Throttle({ default: { ttl: 60000, limit: 10 } })
export class MfaController {
  constructor(private readonly mfa: MfaService) {}

  @Get()
  status(@Request() req: AuthRequest): Promise<MfaStatus> {
    return this.mfa.status(req.user.userId);
  }

  /** Step 1: a new secret for the authenticator app (password needed). */
  @Post('setup')
  @UseGuards(NotInDemoGuard)
  @HttpCode(HttpStatus.OK)
  setup(@Body() body: MfaSetupDto, @Request() req: AuthRequest): Promise<{ secret: string; uri: string }> {
    return this.mfa.setup(req.user.userId, body.password);
  }

  /** Step 2: confirm with a code from the app; returns the recovery codes (shown once). */
  @Post('enable')
  @UseGuards(NotInDemoGuard)
  @HttpCode(HttpStatus.OK)
  enable(@Body() body: MfaCodeDto, @Request() req: AuthRequest): Promise<{ recoveryCodes: string[] }> {
    return this.mfa.enable(req.user.userId, body.code, req.user.sessionId);
  }

  @Post('disable')
  @UseGuards(NotInDemoGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  disable(@Body() body: MfaDisableDto, @Request() req: AuthRequest): Promise<void> {
    return this.mfa.disable(req.user.userId, body.password, body.code, req.user.sessionId);
  }

  @Post('recovery-codes')
  @UseGuards(NotInDemoGuard)
  @HttpCode(HttpStatus.OK)
  regenerate(@Body() body: MfaCodeDto, @Request() req: AuthRequest): Promise<{ recoveryCodes: string[] }> {
    return this.mfa.regenerateRecoveryCodes(req.user.userId, body.code);
  }
}
