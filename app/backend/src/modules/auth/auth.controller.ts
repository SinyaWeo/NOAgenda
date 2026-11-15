import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Request() req: any) {
    try {
      return await this.authService.login(body.username, body.password);
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        // Audit trail for brute-force detection. Never log the password; strip control chars.
        const user = String(body.username).replace(/[^\x20-\x7e]/g, '?').slice(0, 64);
        this.logger.warn(`Failed login for "${user}" from ${req.ip}`);
      }
      throw err;
    }
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: any) {
    return this.authService.refresh(req.user.userId, req.user.username);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout() {
    // JWT is stateless; client should discard the token.
    // Extend with a token blocklist if session invalidation is required.
  }

  @Post('password/token')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    // Always responds 204 to avoid email enumeration; token delivered via email in production.
    await this.authService.requestPasswordReset(body.email);
  }

  @Post('password/reset')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }
}
