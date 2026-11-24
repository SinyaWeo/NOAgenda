import { demoUserList, isDemoMode } from '../../common/demo-users';
import type { AuthRequest } from '../../common/auth-user';
import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService, AuthResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto, ResendVerificationDto } from './dto/email-verification.dto';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { SessionMeta } from '../session/session.service';
import { registrationPolicy, adminAllowsRegistration } from '../user/registration';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { Public } from '../../common/decorators/public.decorator';

const COOKIE_NAME = 'noa_rt';
const isProd = () => process.env.NODE_ENV === 'production';
// The cookie is only sent to the auth endpoints. Behind the /api proxy prefix set REFRESH_COOKIE_PATH=/api/auth.
const cookiePath = () => process.env.REFRESH_COOKIE_PATH || '/auth';
/** Per-IP login attempts per minute (account lockout is separate). Raised only for automated tests. */
const loginLimit = Number(process.env.LOGIN_RATE_LIMIT || 10);
const refreshDays = () => Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

function readCookie(req: AuthRequest, name: string): string | undefined {
  const header: string | undefined = req.headers?.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/** Every route here is reachable without a session: sign-in, cookie refresh, reset and verification flows. */
@Public()
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly emailVerification: EmailVerificationService,
    private readonly appSettings: AppSettingsService,
  ) {}

  private meta(req: AuthRequest): SessionMeta {
    return { userAgent: req.headers?.['user-agent'], ip: req.ip };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true, // not readable by page scripts (XSS cannot steal it)
      secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd(),
      sameSite: 'strict', // never sent on cross-site requests (CSRF)
      path: cookiePath(),
      maxAge: refreshDays() * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(COOKIE_NAME, { path: cookiePath() });
  }

  /** Defence in depth next to SameSite: a browser-sent Origin must be our frontend. */
  private assertSameOrigin(req: AuthRequest) {
    const allowed = process.env.CORS_ORIGIN;
    const origin = req.headers?.origin;
    if (allowed && origin && origin !== allowed) throw new ForbiddenException('Cross-origin request refused');
  }

  private respond(res: Response, result: AuthResult) {
    if (result.refreshToken) this.setRefreshCookie(res, result.refreshToken);
    return { access_token: result.access_token, expires_in: result.expires_in };
  }

  /** Public, non-sensitive settings the UI needs before login. */
  @Get('config')
  async config() {
    const singleUserMode = await this.appSettings.singleUserMode();
    const policy = registrationPolicy(
      process.env,
      adminAllowsRegistration(await this.appSettings.get('allowRegistration')) && !singleUserMode,
    );
    return {
      singleUserMode,
      emailVerificationRequired: this.emailVerification.required,
      termsAcceptanceRequired: process.env.REQUIRE_TERMS_ACCEPTANCE === 'true',
      registrationEnabled: policy.enabled,
      inviteRequired: policy.inviteRequired,
      ...(isDemoMode() ? { demoUsers: demoUserList() } : {}),
    };
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: loginLimit } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Request() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    try {
      return this.respond(res, await this.authService.login(body.username, body.password, this.meta(req)));
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        // Audit trail for brute-force detection. Never log the password; strip control chars.
        const user = String(body.username)
          .replace(/[^\x20-\x7e]/g, '?')
          .slice(0, 64);
        this.logger.warn(`Failed login for "${user}" from ${req.ip}`);
      }
      throw err;
    }
  }

  /** Cookie-authenticated: no bearer token needed (the access token may have just expired). */
  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    this.assertSameOrigin(req);
    const token = readCookie(req, COOKIE_NAME);
    if (!token) throw new UnauthorizedException('No session');
    try {
      return this.respond(res, await this.authService.refresh(token, this.meta(req)));
    } catch (err) {
      this.clearRefreshCookie(res);
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Request() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    this.assertSameOrigin(req);
    await this.authService.logout(undefined, readCookie(req, COOKIE_NAME));
    this.clearRefreshCookie(res);
  }

  @Post('password/token')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    // Always 204 to avoid email enumeration; the link is delivered by email.
    await this.authService.requestPasswordReset(body.email);
  }

  @Post('password/reset')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Post('email/verify')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async verifyEmail(@Body() body: VerifyEmailDto) {
    await this.emailVerification.verify(body.token);
  }

  @Post('email/resend')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendVerification(@Body() body: ResendVerificationDto) {
    // Not awaited and always 204: no way to tell whether the address exists.
    void this.emailVerification.resend(body.email).catch((e) => this.logger.error(e.message));
  }
}
