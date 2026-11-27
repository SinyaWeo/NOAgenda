import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomInt } from 'crypto';
import { User } from '../user/user.entity';
import { SessionService } from '../session/session.service';
import { MailService } from '../mail/mail.service';
import { Translator } from '../../i18n/translator.service';
import { verifyPassword } from '../../common/password';
import { secretBox } from '../../common/secret-box';
import { generateTotpSecret, matchTotp, totpUri } from '../../common/totp';
import { isDemoMode } from '../../common/demo-users';
import { mfaRequiredSql } from './mfa-policy';

export const RECOVERY_CODE_COUNT = 10;
/** Letters and digits that cannot be mistaken for each other when copied by hand. */
const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export interface MfaStatus {
  enabled: boolean;
  enabledAt: Date | null;
  /** Unused recovery codes left. */
  recoveryCodesLeft: number;
  /** An admin setting or one of the user's teams requires 2FA: it cannot be switched off. */
  required: boolean;
}

/** Which second factor a code turned out to be. */
export type MfaCodeKind = 'totp' | 'recovery';

type MfaUser = Pick<
  User,
  'id' | 'username' | 'email' | 'language' | 'password' | 'totpSecret' | 'totpEnabledAt' | 'totpLastStep'
> & { totpRecoveryCodes?: string | null };

/** Domain separation for the keyed hash of recovery codes. */
const RECOVERY_MAC_CONTEXT = 'users.totpRecoveryCodes';

/** Lower case, no spaces or dashes: how recovery codes are compared. */
function normalizeRecoveryCode(code: string): string {
  return code.toLowerCase().replace(/[\s-]/g, '');
}

/**
 * What is stored for a recovery code: a keyed hash (HMAC with a key derived from SECRETS_KEY, see
 * SecretBox.mac). A plain hash would let someone with a copy of the database guess these short codes
 * offline; without the key they cannot.
 */
function hashRecoveryCode(code: string): string {
  return secretBox().mac(normalizeRecoveryCode(code), RECOVERY_MAC_CONTEXT);
}

function recoveryCodeMatches(stored: string, code: string): boolean {
  return secretBox().macMatches(stored, normalizeRecoveryCode(code), RECOVERY_MAC_CONTEXT);
}

function newRecoveryCodes(): string[] {
  const part = () => Array.from({ length: 5 }, () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]).join('');
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => `${part()}-${part()}`);
}

function parseHashes(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Two-factor authentication with an authenticator app (TOTP, common/totp.ts) plus single-use recovery
 * codes. The secret is encrypted at rest; recovery codes are stored only as keyed hashes
 * (HMAC with a key from SECRETS_KEY) and shown once.
 * Switching 2FA on or off signs the account out everywhere else and tells the owner by email.
 */
@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly sessions: SessionService,
    private readonly mail: MailService,
    private readonly translator: Translator,
  ) {}

  private async load(userId: number): Promise<MfaUser | null> {
    return this.users
      .createQueryBuilder('u')
      .addSelect(['u.password', 'u.totpSecret', 'u.totpLastStep', 'u.totpRecoveryCodes'])
      .where('u.id = :id', { id: userId })
      .getOne();
  }

  private async loadOrFail(userId: number): Promise<MfaUser> {
    const user = await this.load(userId);
    if (!user) throw new BadRequestException('Unknown user');
    return user;
  }

  /** Whether an admin setting or a team requires 2FA from this user (on or not). */
  async isRequired(userId: number): Promise<boolean> {
    const rows: { required: unknown }[] = await this.users.query(
      `SELECT ${mfaRequiredSql('u')} AS required FROM users u WHERE u.id = ?`,
      [userId],
    );
    return Number(rows[0]?.required) === 1;
  }

  async isEnabled(userId: number): Promise<boolean> {
    const user = await this.users.findOne({ where: { id: userId }, select: { id: true, totpEnabledAt: true } });
    return !!user?.totpEnabledAt;
  }

  async status(userId: number): Promise<MfaStatus> {
    const user = await this.loadOrFail(userId);
    return {
      enabled: !!user.totpEnabledAt,
      enabledAt: user.totpEnabledAt ?? null,
      recoveryCodesLeft: user.totpEnabledAt ? parseHashes(user.totpRecoveryCodes).length : 0,
      required: !isDemoMode() && (await this.isRequired(userId)),
    };
  }

  /**
   * Step 1 of switching 2FA on: a new secret for the authenticator app (as text and as the otpauth URI the
   * QR code shows). Nothing changes for sign-in until `enable` confirms a code from the app.
   */
  async setup(userId: number, password: string): Promise<{ secret: string; uri: string }> {
    const user = await this.loadOrFail(userId);
    if (!(await verifyPassword(password, user.password))) throw new BadRequestException('Incorrect password');
    if (user.totpEnabledAt) throw new ConflictException('Two-factor authentication is already on');
    const secret = generateTotpSecret();
    await this.users.update(userId, { totpSecret: secret, totpLastStep: null });
    const issuer = await this.mail.appName().catch(() => 'NOAgenda');
    return { secret, uri: totpUri(secret, user.username, issuer) };
  }

  /**
   * Step 2: the first code from the app proves it was set up right. Turns 2FA on and returns the recovery
   * codes, the only time they are ever shown. Other sessions of the account are signed out.
   */
  async enable(userId: number, code: string, keepSessionId?: number): Promise<{ recoveryCodes: string[] }> {
    const user = await this.loadOrFail(userId);
    if (user.totpEnabledAt) throw new ConflictException('Two-factor authentication is already on');
    if (!user.totpSecret) throw new BadRequestException('Start the setup first');
    const step = matchTotp(user.totpSecret, code);
    if (step === null) throw new BadRequestException('Invalid code');
    const recoveryCodes = newRecoveryCodes();
    await this.users.update(userId, {
      totpEnabledAt: new Date(),
      totpLastStep: step,
      totpRecoveryCodes: JSON.stringify(recoveryCodes.map(hashRecoveryCode)),
    });
    await this.sessions.revokeAllForUser(userId, keepSessionId);
    this.notify(user, 'enabled');
    return { recoveryCodes };
  }

  /** Switch 2FA off (password and a current code). Refused while an admin setting or a team requires it. */
  async disable(userId: number, password: string, code: string, keepSessionId?: number): Promise<void> {
    const user = await this.loadOrFail(userId);
    if (!user.totpEnabledAt) throw new BadRequestException('Two-factor authentication is not on');
    if (!(await verifyPassword(password, user.password))) throw new BadRequestException('Incorrect password');
    if (await this.isRequired(userId)) {
      throw new ForbiddenException('Two-factor authentication is required for your account');
    }
    if (!(await this.verify(userId, code))) throw new BadRequestException('Invalid code');
    await this.clear(userId);
    await this.sessions.revokeAllForUser(userId, keepSessionId);
    this.notify(user, 'disabled');
  }

  /** New recovery codes (a current code from the app needed); the old ones stop working. */
  async regenerateRecoveryCodes(userId: number, code: string): Promise<{ recoveryCodes: string[] }> {
    const user = await this.loadOrFail(userId);
    if (!user.totpEnabledAt || !user.totpSecret) throw new BadRequestException('Two-factor authentication is not on');
    if ((await this.verify(userId, code, { allowRecovery: false })) === null) {
      throw new BadRequestException('Invalid code');
    }
    const recoveryCodes = newRecoveryCodes();
    await this.users.update(userId, {
      totpRecoveryCodes: JSON.stringify(recoveryCodes.map(hashRecoveryCode)),
    });
    return { recoveryCodes };
  }

  /**
   * Check a second-factor code for sign-in or step-up: a code from the app (each one is good once), or,
   * unless `allowRecovery` is false, one of the recovery codes (used up by this). Null when it does not
   * match or 2FA is off.
   */
  async verify(userId: number, code: string, opts: { allowRecovery?: boolean } = {}): Promise<MfaCodeKind | null> {
    const user = await this.load(userId);
    if (!user?.totpEnabledAt || !user.totpSecret) return null;
    const step = matchTotp(user.totpSecret, code, user.totpLastStep ?? null);
    if (step !== null) {
      // Compare-and-set: of two requests with the same code only one gets it accepted.
      const res = await this.users
        .createQueryBuilder()
        .update(User)
        .set({ totpLastStep: step })
        .where('id = :id AND (totpLastStep IS NULL OR totpLastStep < :step)', { id: userId, step })
        .execute();
      return res.affected ? 'totp' : null;
    }
    if (opts.allowRecovery === false) return null;
    const hashes = parseHashes(user.totpRecoveryCodes);
    const hash = hashes.find((h) => recoveryCodeMatches(h, code));
    if (!hash) return null;
    const res = await this.users
      .createQueryBuilder()
      .update(User)
      .set({ totpRecoveryCodes: JSON.stringify(hashes.filter((h) => h !== hash)) })
      .where('id = :id AND totpRecoveryCodes = :old', { id: userId, old: user.totpRecoveryCodes })
      .execute();
    return res.affected ? 'recovery' : null;
  }

  /** An admin switches a user's 2FA off (lost phone and recovery codes). The user is told by email. */
  async adminReset(userId: number): Promise<void> {
    const user = await this.loadOrFail(userId);
    await this.clear(userId);
    if (user.totpEnabledAt) this.notify(user, 'reset');
  }

  private async clear(userId: number): Promise<void> {
    await this.users.update(userId, {
      totpSecret: null,
      totpEnabledAt: null,
      totpLastStep: null,
      totpRecoveryCodes: null,
    });
  }

  /** Security notice to the owner, in their saved language. Not awaited: mail trouble must not block the change. */
  private notify(user: MfaUser, what: 'enabled' | 'disabled' | 'reset'): void {
    void (async () => {
      const app = await this.mail.appName().catch(() => 'NOAgenda');
      const args = { app, username: user.username };
      await this.mail.send({
        to: user.email,
        subject: this.translator.t(user.language, `email.mfa.${what}.subject`, args),
        text: this.translator.t(user.language, `email.mfa.${what}.body`, args),
      });
    })().catch((e: Error) => this.logger.warn(`2FA notice to user ${user.id} failed: ${e.message}`));
  }
}
