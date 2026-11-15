import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SessionService } from '../session/session.service';
import { ApiTokenService, API_TOKEN_PREFIX, ApiTokenUser } from '../api-token/api-token.service';
import { UserRole } from '../user/user-role.enum';

/**
 * passport-jwt, extended so `Authorization: Bearer noa_...` API tokens are accepted
 * through the same 'jwt' guard that protects every route.
 */
class JwtOrApiTokenStrategy extends Strategy {
  private readonly resolveApiToken: (raw: string) => Promise<ApiTokenUser | null>;

  constructor(options: any, verify: any) {
    super(options, verify);
    this.resolveApiToken = options.resolveApiToken;
  }

  authenticate(req: any, options?: any): void {
    const raw = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (raw?.startsWith(API_TOKEN_PREFIX)) {
      this.resolveApiToken(raw)
        .then((u) =>
          u
            ? (this as any).success({
                userId: u.id,
                username: u.username,
                role: u.role as UserRole,
                apiTokenId: u.tokenId,
                viaApiToken: true,
              })
            : (this as any).fail('Invalid API token', 401),
        )
        .catch((err) => (this as any).error(err));
      return;
    }
    super.authenticate(req, options);
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(JwtOrApiTokenStrategy, 'jwt') {
  constructor(
    private readonly sessions: SessionService,
    apiTokens: ApiTokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
      algorithms: ['HS256'],
      resolveApiToken: (raw: string) => apiTokens.authenticate(raw),
    });
  }

  /**
   * Runs after the signature/expiry check. The token is only good while its session
   * exists, and the role always comes from the database, never from the token.
   */
  async validate(payload: { sub?: number; sid?: number }) {
    if (!payload?.sub || !payload?.sid) throw new UnauthorizedException();
    const user = await this.sessions.findUserForSession(payload.sid, payload.sub);
    if (!user) throw new UnauthorizedException();
    return { userId: user.id, username: user.username, role: user.role as UserRole, sessionId: payload.sid };
  }
}
