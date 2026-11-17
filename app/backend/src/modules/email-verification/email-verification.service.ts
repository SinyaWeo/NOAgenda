import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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

  /** Issue a fresh token and email it. Safe to call repeatedly; delivery is not awaited by callers that must be uniform. */
  async send(user: Pick<User, 'id' | 'email' | 'username'> & { language?: string | null }): Promise<boolean> {
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
      subject: this.translator.t(user.language, 'email.verify.subject', args),
      text: this.translator.t(user.language, 'email.verify.body', args),
    });
  }

  async verify(token: string): Promise<void> {
    const record = await this.tokens.findOne({ where: { tokenHash: sha256(token) }, relations: ['user'] });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      if (record) await this.tokens.delete(record.id);
      throw new BadRequestException('Invalid or expired verification link');
    }
    // The link only counts if the user still has the address it was sent to.
    if (record.user.email !== record.email) {
      await this.tokens.delete(record.id);
      throw new BadRequestException('Invalid or expired verification link');
    }
    await this.users.update(record.user.id, { isEmailConfirmed: true });
    await this.tokens.delete({ user: { id: record.user.id } });
  }

  /** Resend for an unverified account. Callers always answer 204, whatever happens here. */
  async resend(email: string): Promise<void> {
    const user = await this.users.findOne({ where: { email } });
    if (!user || user.isEmailConfirmed) return;
    await this.send(user);
  }
}
