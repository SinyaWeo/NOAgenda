import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { EmailVerificationToken } from '../auth/email-verification-token.entity';
import { MailService } from '../mail/mail.service';
import { randomToken, sha256 } from '../../common/tokens';
import { Translator } from '../../i18n/translator.service';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly tokens: Repository<EmailVerificationToken>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly mail: MailService,
    private readonly translator: Translator,
  ) {}

  /**
   * Whether login requires a verified address. Defaults to on when email can be
   * delivered and off otherwise (so a server without SMTP is not locked out).
   * Override with REQUIRE_EMAIL_VERIFICATION=true|false.
   */
  get required(): boolean {
    const v = process.env.REQUIRE_EMAIL_VERIFICATION;
    return v ? v === 'true' : this.mail.enabled; // empty/unset => follow whether mail can be delivered
  }

  /**
   * Issue a fresh token for `user.email` and email it. Safe to call repeatedly; delivery is not awaited by
   * callers that must be uniform. `kind: 'change'` words it as confirming a new address (see requestChange).
   */
  async send(
    user: Pick<User, 'id' | 'email' | 'username'> & { language?: string | null },
    kind: 'verify' | 'change' = 'verify',
  ): Promise<boolean> {
    await this.tokens.delete({ user: { id: user.id } });
    const token = randomToken(32);
    await this.tokens.save(
      this.tokens.create({
        tokenHash: sha256(token),
        user: { id: user.id } as User,
        email: user.email,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      }),
    );
    const app = await this.mail.appName();
    // In the recipient's own language: this goes out while they are not looking at the app.
    const args = { app, username: user.username, link: this.mail.link('/user/verify-email', { token }) };
    return this.mail.send({
      to: user.email,
      subject: this.translator.t(user.language, `email.${kind}.subject`, args),
      text: this.translator.t(user.language, `email.${kind}.body`, args),
    });
  }

  /**
   * Start changing a user's address. The account keeps its current email until the link sent to the
   * new one is opened (verify() then switches it). Without working mail there is no way to confirm,
   * so the address is changed at once. Returns whether the change is now pending.
   */
  async requestChange(
    user: Pick<User, 'id' | 'email' | 'username'> & { language?: string | null },
    newEmail: string,
  ): Promise<boolean> {
    if (!this.mail.enabled) {
      await this.tokens.delete({ user: { id: user.id } });
      await this.users.update(user.id, { email: newEmail });
      return false;
    }
    await this.send({ ...user, email: newEmail }, 'change');
    return true;
  }

  /** The address a change is waiting to be confirmed for, if any (a live token for another address). */
  async pendingEmail(user: Pick<User, 'id' | 'email'>): Promise<string | null> {
    const live = await this.tokens.find({ where: { user: { id: user.id } } });
    const now = Date.now();
    return live.find((t) => t.email !== user.email && t.expiresAt.getTime() > now)?.email ?? null;
  }

  /** Drop a pending address change (links already sent stop working). */
  async cancelChange(user: Pick<User, 'id' | 'email'>): Promise<void> {
    const live = await this.tokens.find({ where: { user: { id: user.id } } });
    const stale = live.filter((t) => t.email !== user.email).map((t) => t.id);
    if (stale.length) await this.tokens.delete(stale);
  }

  async verify(token: string): Promise<void> {
    const record = await this.tokens.findOne({ where: { tokenHash: sha256(token) }, relations: { user: true } });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      if (record) await this.tokens.delete(record.id);
      throw new BadRequestException('Invalid or expired verification link');
    }
    // Issuing a token deletes the user's older ones, so a live token is always for the latest request.
    const user = record.user;
    const oldEmail = user.email;
    if (record.email !== oldEmail) {
      // A confirmed address change: someone may have taken the address since it was requested.
      const taken = await this.users.findOne({ where: { email: record.email } });
      if (taken && taken.id !== user.id) {
        await this.tokens.delete(record.id);
        throw new ConflictException('Email is already in use');
      }
    }
    await this.users.update(user.id, { email: record.email, isEmailConfirmed: true });
    await this.tokens.delete({ user: { id: user.id } });
    if (record.email !== oldEmail) await this.notifyChanged(user, oldEmail, record.email);
  }

  /** Tell the previous address that the account no longer uses it (in case it was not its owner's doing). */
  private async notifyChanged(user: User, oldEmail: string, newEmail: string): Promise<void> {
    const args = { app: await this.mail.appName(), username: user.username, newEmail };
    await this.mail.send({
      to: oldEmail,
      subject: this.translator.t(user.language, 'email.changed.subject', args),
      text: this.translator.t(user.language, 'email.changed.body', args),
    });
  }

  /** Resend for an unverified account. Callers always answer 204, whatever happens here. */
  async resend(email: string): Promise<void> {
    const user = await this.users.findOne({ where: { email } });
    if (!user || user.isEmailConfirmed) return;
    await this.send(user);
  }
}
