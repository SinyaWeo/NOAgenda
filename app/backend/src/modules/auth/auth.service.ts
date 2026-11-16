import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { PasswordResetToken } from './password-reset-token.entity';
import { SessionService, SessionMeta } from '../session/session.service';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { MailService } from '../mail/mail.service';
import { hashPassword, needsRehash, verifyPassword } from '../../common/password';
import { randomToken, sha256 } from '../../common/tokens';
import { LoginThrottle } from '../../common/login-throttle';

/** Wrong passwords from ONE address for ONE account before that address is locked out. */
export const MAX_FAILED_LOGINS = Number(process.env.MAX_FAILED_LOGINS || 5);
/** Wrong passwords for one account from ALL addresses together before the account is locked (distributed guessing). */
export const ACCOUNT_LOCK_THRESHOLD = Number(process.env.ACCOUNT_LOCK_THRESHOLD || 20);
export const LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES || 15);
const RESET_TTL_MS = 60 * 60 * 1000;

/** Same text for unknown user, wrong password and locked account, so none can be told apart. */
const INVALID_CREDENTIALS = 'Invalid credentials, or the account is temporarily locked';

export interface AuthResult {
  access_token: string;
  expires_in: number;
  /** Set (and to be placed in the httpOnly cookie) unless the request lost a benign refresh race. */
  refreshToken: string | null;
}

@Injectable()
export class AuthService {
  private readonly throttle = new LoginThrottle(MAX_FAILED_LOGINS, LOCKOUT_MINUTES * 60 * 1000);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepository: Repository<PasswordResetToken>,
    private readonly sessions: SessionService,
    private readonly emailVerification: EmailVerificationService,
    private readonly mail: MailService,
  ) {}

  private signAccessToken(user: { id: number; username: string; role: string }, sessionId: number) {
    const payload = { sub: user.id, username: user.username, role: user.role, sid: sessionId };
    const access_token = this.jwtService.sign(payload);
    const { exp, iat } = this.jwtService.decode(access_token) as { exp: number; iat: number };
    return { access_token, expires_in: exp - iat };
  }

  async login(username: string, password: string, meta: SessionMeta = {}): Promise<AuthResult> {
    const user = await this.userService.findByUsername(username);

    // Always do one bcrypt comparison, user or no user, so timing does not reveal which usernames exist.
    const passwordOk = await verifyPassword(password, user?.password);

    // 1) This address has already failed too often for this account: refuse, even a correct password.
    const addressLocked = this.throttle.isLocked(username, meta.ip);
    // 2) Many addresses together have been guessing at this account: it is locked, EXCEPT for an
    //    address the owner is already signed in from. So a botnet cannot lock the real owner out.
    const accountLocked = !!user?.lockedUntil && user.lockedUntil.getTime() > Date.now();
    const trustedAddress = accountLocked && !!user && (await this.sessions.hasActiveSessionFromIp(user.id, meta.ip));
    const blocked = addressLocked || (accountLocked && !trustedAddress);

    if (!user || blocked || !passwordOk) {
      if (!blocked) {
        this.throttle.recordFailure(username, meta.ip);
        if (user && !accountLocked) {
          await this.userService.recordFailedLogin(
            user.id,
            ACCOUNT_LOCK_THRESHOLD,
            new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000),
          );
        }
      }
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    this.throttle.clear(username, meta.ip);

    if (this.emailVerification.required && !user.isEmailConfirmed) {
      // Only reachable with the correct password, so this does not disclose accounts.
      throw new ForbiddenException({ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address first' });
    }

    if (needsRehash(user.password)) {
      await this.userService.setPasswordHash(user.id, await hashPassword(password));
    }
    if (user.failedLoginAttempts || user.lockedUntil) await this.userService.resetLoginState(user.id);

    const { session, refreshToken } = await this.sessions.create(user.id, meta);
    return { ...this.signAccessToken(user, session.id), refreshToken };
  }

  /** Trade a valid refresh token for a new access token (and a rotated refresh token). */
  async refresh(presented: string, meta: SessionMeta = {}): Promise<AuthResult> {
    const { session, refreshToken } = await this.sessions.rotate(presented, meta);
    const user = await this.userService.findById(session.userId);
    if (!user) {
      await this.sessions.revokeById(session.id);
      throw new UnauthorizedException('Invalid refresh token');
    }
    return { ...this.signAccessToken(user, session.id), refreshToken };
  }

  async logout(sessionId?: number, refreshToken?: string): Promise<void> {
    if (refreshToken) await this.sessions.revokeByRefreshToken(refreshToken);
    if (sessionId) await this.sessions.revokeById(sessionId);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    // Always succeeds from the caller's point of view (no email enumeration), and takes about as
    // long for an unknown address: do the same kind of database + hashing work before returning.
    if (!user) {
      sha256(randomToken(32));
      await this.resetTokenRepository.delete({ user: { id: 0 } }).catch(() => undefined);
      return;
    }
    await this.resetTokenRepository.delete({ user: { id: user.id } });

    const token = randomToken(32);
    await this.resetTokenRepository.save(
      this.resetTokenRepository.create({
        token: sha256(token), // only the hash is stored; the raw token travels by email
        user,
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      }),
    );
    // Not awaited: the response time must not reveal whether the account exists.
    void this.mail.send({
      to: user.email,
      subject: 'Reset your NOAgenda password',
      text:
        `Hi ${user.username},\n\n` +
        `Someone asked to reset the password for your account. Open this link within 1 hour to choose a new one:\n\n` +
        `${this.mail.link('/user/password-reset', { token })}\n\n` +
        `If this was not you, ignore this email: your password stays unchanged.`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.resetTokenRepository.findOne({
      where: { token: sha256(token) },
      relations: ['user'],
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      if (record) await this.resetTokenRepository.delete(record.id);
      throw new BadRequestException('Invalid or expired reset token');
    }
    // Claim the token first. The delete is atomic, so of two concurrent requests with the same
    // token only one gets affected=1 (single use), and a crash after this point cannot leave a
    // still-valid token behind.
    const claimed = await this.resetTokenRepository.delete(record.id);
    if (!claimed?.affected) throw new BadRequestException('Invalid or expired reset token');
    await this.userService.update(record.user.id, { password: newPassword, isEmailConfirmed: true });
    await this.userService.resetLoginState(record.user.id);
    this.throttle.clearUser(record.user.username);
    await this.resetTokenRepository.delete({ user: { id: record.user.id } }); // any other outstanding tokens
    await this.sessions.revokeAllForUser(record.user.id); // sign out everywhere
  }
}
