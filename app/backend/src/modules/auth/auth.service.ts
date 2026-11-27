import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { PasswordResetToken } from './password-reset-token.entity';
import { SessionService, SessionMeta } from '../session/session.service';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { MailService } from '../mail/mail.service';
import { Translator } from '../../i18n/translator.service';
import { hashPassword, needsRehash, verifyPassword } from '../../common/password';
import { randomToken, sha256 } from '../../common/tokens';
import { LoginThrottle } from '../../common/login-throttle';

/** Wrong passwords from ONE address for ONE account before that address is locked out. */
export const MAX_FAILED_LOGINS = Number(process.env.MAX_FAILED_LOGINS || 5);
/** Wrong passwords for one account from ALL addresses together before the account is locked (distributed guessing). */
export const ACCOUNT_LOCK_THRESHOLD = Number(process.env.ACCOUNT_LOCK_THRESHOLD || 20);
export const LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES || 15);
const RESET_TTL_MS = 60 * 60 * 1000;
/** How long the activation link of an admin-created account stays valid. */
export const INVITE_TTL_MS = 72 * 60 * 60 * 1000;
/** How long a step-up (password re-entered) allows admin changes from that session. */
export const STEP_UP_MINUTES = Number(process.env.ADMIN_STEP_UP_MINUTES || 15);

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
    private readonly translator: Translator,
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

    if (user.isLocked) {
      // Only reachable with the correct password, so this does not disclose accounts.
      throw new ForbiddenException('Account is locked');
    }

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

  /**
   * Step-up login: the signed-in user re-enters their password, and their current session may then make
   * admin changes for STEP_UP_MINUTES. Wrong passwords count toward the same per-address lockout as
   * sign-in, so this cannot be used to guess a password faster.
   */
  async stepUp(
    who: { userId: number; username: string; sessionId?: number },
    password: string,
    ip?: string,
  ): Promise<{ elevatedUntil: Date }> {
    if (!who.sessionId) throw new ForbiddenException('Step-up needs a signed-in session');
    if (this.throttle.isLocked(who.username, ip)) {
      throw new HttpException('Too many failed attempts, try again later', HttpStatus.TOO_MANY_REQUESTS);
    }
    const user = await this.userService.findById(who.userId);
    if (!user || !(await verifyPassword(password, user.password))) {
      this.throttle.recordFailure(who.username, ip);
      throw new BadRequestException('Incorrect password');
    }
    this.throttle.clear(who.username, ip);
    const elevatedUntil = new Date(Date.now() + STEP_UP_MINUTES * 60 * 1000);
    await this.sessions.elevate(who.sessionId, who.userId, elevatedUntil);
    return { elevatedUntil };
  }

  /** Trade a valid refresh token for a new access token (and a rotated refresh token). */
  async refresh(presented: string, meta: SessionMeta = {}): Promise<AuthResult> {
    const { session, refreshToken } = await this.sessions.rotate(presented, meta);
    const user = await this.userService.findById(session.userId);
    if (!user || user.isLocked) {
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
    void this.sendResetMail(user, token);
  }

  private async sendResetMail(
    user: { email: string; username: string; language?: string | null },
    token: string,
  ): Promise<void> {
    const app = await this.mail.appName().catch(() => 'NOAgenda');
    const args = { app, username: user.username, link: this.mail.link('/user/password-reset', { token }) };
    await this.mail.send({
      to: user.email,
      subject: this.translator.t(user.language, 'email.reset.subject', args),
      text: this.translator.t(user.language, 'email.reset.body', args),
    });
  }

  /**
   * Email the activation link of an account an admin created: the user opens it to choose a password,
   * which also confirms the address (resetPassword). Older links stop working. Returns the link as well,
   * so an admin can pass it on by hand when mail cannot be delivered.
   */
  async sendInvite(user: {
    id: number;
    email: string;
    username: string;
    language?: string | null;
  }): Promise<{ delivered: boolean; link: string }> {
    await this.resetTokenRepository.delete({ user: { id: user.id } });
    const token = randomToken(32);
    await this.resetTokenRepository.save(
      this.resetTokenRepository.create({
        token: sha256(token),
        user: { id: user.id },
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      }),
    );
    await this.userService.markInvited(user.id);
    const link = this.mail.link('/user/password-reset', { token, invite: '1' });
    const app = await this.mail.appName().catch(() => 'NOAgenda');
    const args = { app, username: user.username, link };
    const delivered = await this.mail.send({
      to: user.email,
      subject: this.translator.t(user.language, 'email.invite.subject', args),
      text: this.translator.t(user.language, 'email.invite.body', args),
    });
    return { delivered, link };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.resetTokenRepository.findOne({
      where: { token: sha256(token) },
      relations: { user: true },
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
