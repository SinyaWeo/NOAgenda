import { realTranslator } from '../../../i18n/__tests__/fake-i18n';
import { BadRequestException, ForbiddenException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import {
  AuthService,
  MAX_FAILED_LOGINS,
  ACCOUNT_LOCK_THRESHOLD,
  STEP_UP_MINUTES,
  INVITE_TTL_MS,
} from '../auth.service';
import * as password from '../../../common/password';
import { sha256 } from '../../../common/tokens';
import type { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import type { UserService } from '../../user/user.service';
import type { PasswordResetToken } from '../password-reset-token.entity';
import type { SessionService } from '../../session/session.service';
import type { EmailVerificationService } from '../../email-verification/email-verification.service';
import type { MailService } from '../../mail/mail.service';
import type { MfaService } from '../../mfa/mfa.service';
import { asMock } from '../../../common/__tests__/test-utils';

jest.mock('../../../common/password');
const pw = password as jest.Mocked<typeof password>;

const USER = {
  id: 7,
  username: 'ann',
  email: 'ann@example.com',
  role: 'user',
  password: '$2a$12$hash',
  isEmailConfirmed: true,
  failedLoginAttempts: 0,
  lockedUntil: undefined as Date | undefined,
};

type TestUser = typeof USER & { language?: string; totpEnabledAt?: Date | null; isLocked?: boolean };

function build(over: { user?: TestUser | null; verificationRequired?: boolean } = {}) {
  const user: TestUser | null = over.user === undefined ? { ...USER } : over.user;
  const users = {
    findByUsername: jest.fn(async () => user),
    findByEmail: jest.fn(async () => user),
    findById: jest.fn(async () => user),
    recordFailedLogin: jest.fn(),
    resetLoginState: jest.fn(),
    setPasswordHash: jest.fn(),
    update: jest.fn(),
    markInvited: jest.fn(async () => undefined),
  };
  const jwt = {
    sign: jest.fn((_payload: Record<string, unknown>, _opts?: unknown) => 'jwt'),
    decode: jest.fn(() => ({ iat: 100, exp: 1000 })),
    verify: jest.fn((_token: string): Record<string, unknown> => ({ sub: 7, purpose: 'mfa-login', jti: 'c1' })),
  };
  const mfa = {
    verify: jest.fn(async (_id: number, _code: string, _opts?: unknown): Promise<string | null> => 'totp'),
  };
  const resets = {
    delete: jest.fn(async () => ({ affected: 1 })),
    save: jest.fn(async (x: Record<string, unknown>) => x),
    create: jest.fn((x: Record<string, unknown>) => x),
    findOne: jest.fn(),
  };
  const sessions = {
    create: jest.fn(async () => ({ session: { id: 55 }, refreshToken: 'rt' })),
    rotate: jest.fn(),
    revokeAllForUser: jest.fn(),
    revokeById: jest.fn(),
    revokeByRefreshToken: jest.fn(),
    hasActiveSessionFromIp: jest.fn(async (_id: number, _ip: string) => false),
    elevate: jest.fn(async () => undefined),
  };
  const verification = { required: over.verificationRequired ?? false };
  const mail = {
    send: jest.fn(async (_mail: { subject: string; text: string }) => true),
    appName: jest.fn(async () => 'Acme'),
    link: jest.fn((p: string, q: Record<string, string>) => `https://app${p}?${new URLSearchParams(q)}`),
  };
  const svc = new AuthService(
    asMock<UserService>(users),
    asMock<JwtService>(jwt),
    asMock<Repository<PasswordResetToken>>(resets),
    asMock<SessionService>(sessions),
    asMock<EmailVerificationService>(verification),
    asMock<MailService>(mail),
    realTranslator(),
    asMock<MfaService>(mfa),
  );
  return { svc, users, jwt, resets, sessions, mail, mfa };
}

beforeEach(() => {
  jest.resetAllMocks();
  pw.verifyPassword.mockResolvedValue(true);
  pw.needsRehash.mockReturnValue(false);
  pw.hashPassword.mockResolvedValue('$2a$12$new');
});

describe('AuthService.login', () => {
  it('issues a session-bound access token and a refresh token', async () => {
    const { svc, sessions, jwt } = build();
    const res = await svc.login('ann', 'pw', { ip: '1.2.3.4' });
    expect(sessions.create).toHaveBeenCalledWith(7, { ip: '1.2.3.4' });
    expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({ sub: 7, sid: 55 }));
    expect(res).toEqual({ access_token: 'jwt', expires_in: 900, refreshToken: 'rt' });
  });

  it('still verifies a password when the user does not exist (uniform timing) and fails generically', async () => {
    const { svc, users } = build({ user: null });
    pw.verifyPassword.mockResolvedValue(false);
    await expect(svc.login('ghost', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(pw.verifyPassword).toHaveBeenCalledWith('pw', undefined);
    expect(users.recordFailedLogin).not.toHaveBeenCalled();
  });

  it('counts a failed attempt for a real user and uses the same error', async () => {
    const { svc, users } = build();
    pw.verifyPassword.mockResolvedValue(false);
    const err = await svc.login('ann', 'bad').catch((e) => e);
    expect(err).toBeInstanceOf(UnauthorizedException);
    expect(users.recordFailedLogin).toHaveBeenCalledWith(7, ACCOUNT_LOCK_THRESHOLD, expect.any(Date));
    const unknown = await build({ user: null })
      .svc.login('x', 'bad')
      .catch((e) => e);
    expect(unknown.message).toBe(err.message);
  });

  it('rejects a locked account even with the correct password, and creates no session', async () => {
    const { svc, users, sessions } = build({ user: { ...USER, lockedUntil: new Date(Date.now() + 60_000) } });
    await expect(svc.login('ann', 'right')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.create).not.toHaveBeenCalled();
    expect(users.recordFailedLogin).not.toHaveBeenCalled(); // lock is not extended by guessing
  });

  describe('lockout cannot be used to shut the real owner out', () => {
    const ATTACKER = { ip: '6.6.6.6' };
    const OWNER = { ip: '1.2.3.4' };

    it('an attacker locks only their own address after MAX_FAILED_LOGINS wrong passwords', async () => {
      const { svc, sessions } = build();
      pw.verifyPassword.mockImplementation(async (plain: string) => plain === 'right');
      for (let i = 0; i < MAX_FAILED_LOGINS; i++) await svc.login('ann', 'guess', ATTACKER).catch(() => undefined);
      // the attacker is now refused even with the right password ...
      await expect(svc.login('ann', 'right', ATTACKER)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(sessions.create).not.toHaveBeenCalled();
      // ... but the owner, from another address, signs in normally
      await expect(svc.login('ann', 'right', OWNER)).resolves.toMatchObject({ refreshToken: 'rt' });
    });

    it('a locked-out attacker cannot lock other accounts or extend the lock by guessing', async () => {
      const { svc, users } = build();
      pw.verifyPassword.mockResolvedValue(false);
      for (let i = 0; i < MAX_FAILED_LOGINS; i++) await svc.login('ann', 'guess', ATTACKER).catch(() => undefined);
      users.recordFailedLogin.mockClear();
      await svc.login('ann', 'guess', ATTACKER).catch(() => undefined);
      expect(users.recordFailedLogin).not.toHaveBeenCalled();
    });

    it('a distributed attack that locks the account still lets the owner in from an address they are signed in on', async () => {
      const locked = { ...USER, lockedUntil: new Date(Date.now() + 60_000) };
      const { svc, sessions } = build({ user: locked });
      sessions.hasActiveSessionFromIp.mockImplementation(async (_id: number, ip: string) => ip === OWNER.ip);
      await expect(svc.login('ann', 'right', OWNER)).resolves.toMatchObject({ refreshToken: 'rt' });
      await expect(svc.login('ann', 'right', { ip: '9.9.9.9' })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("a wrong password from the owner's own address is still rejected while the account is locked", async () => {
      const locked = { ...USER, lockedUntil: new Date(Date.now() + 60_000) };
      const { svc, sessions } = build({ user: locked });
      sessions.hasActiveSessionFromIp.mockResolvedValue(true);
      pw.verifyPassword.mockResolvedValue(false);
      await expect(svc.login('ann', 'wrong', OWNER)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  it('lets a user back in once the lock has expired and clears the counters', async () => {
    const { svc, users } = build({
      user: { ...USER, failedLoginAttempts: 3, lockedUntil: new Date(Date.now() - 1000) },
    });
    await expect(svc.login('ann', 'right')).resolves.toMatchObject({ refreshToken: 'rt' });
    expect(users.resetLoginState).toHaveBeenCalledWith(7);
  });

  it('blocks unverified addresses with a machine-readable code only after the password is right', async () => {
    const { svc, sessions } = build({ user: { ...USER, isEmailConfirmed: false }, verificationRequired: true });
    const err: ForbiddenException = await svc.login('ann', 'right').catch((e) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect((err.getResponse() as { code: string }).code).toBe('EMAIL_NOT_VERIFIED');
    expect(sessions.create).not.toHaveBeenCalled();

    pw.verifyPassword.mockResolvedValue(false);
    const wrong = await build({ user: { ...USER, isEmailConfirmed: false }, verificationRequired: true })
      .svc.login('ann', 'bad')
      .catch((e) => e);
    expect(wrong).toBeInstanceOf(UnauthorizedException); // wrong password never reveals verification state
  });

  it('does not require verification when it is switched off', async () => {
    const { svc } = build({ user: { ...USER, isEmailConfirmed: false }, verificationRequired: false });
    await expect(svc.login('ann', 'right')).resolves.toBeDefined();
  });

  it('upgrades an old low-cost hash on successful login', async () => {
    const { svc, users } = build();
    pw.needsRehash.mockReturnValue(true);
    await svc.login('ann', 'right');
    expect(users.setPasswordHash).toHaveBeenCalledWith(7, '$2a$12$new');
  });
});

describe('AuthService.stepUp', () => {
  const WHO = { userId: 7, username: 'ann', sessionId: 55 };

  it('elevates this session for STEP_UP_MINUTES after the right password', async () => {
    const { svc, sessions } = build();
    const before = Date.now();
    const { elevatedUntil } = await svc.stepUp(WHO, { password: 'pw' }, '1.2.3.4');
    const minutes = (elevatedUntil.getTime() - before) / 60_000;
    expect(minutes).toBeGreaterThan(STEP_UP_MINUTES - 0.01);
    expect(minutes).toBeLessThan(STEP_UP_MINUTES + 0.01);
    expect(sessions.elevate).toHaveBeenCalledWith(55, 7, elevatedUntil);
    expect(pw.verifyPassword).toHaveBeenCalledWith('pw', USER.password);
  });

  it('refuses a wrong password without elevating', async () => {
    const { svc, sessions } = build();
    pw.verifyPassword.mockResolvedValue(false);
    await expect(svc.stepUp(WHO, { password: 'nope' }, '1.2.3.4')).rejects.toThrow(BadRequestException);
    expect(sessions.elevate).not.toHaveBeenCalled();
  });

  it('wrong passwords lock the address out, even before a correct one', async () => {
    const { svc } = build();
    pw.verifyPassword.mockResolvedValue(false);
    for (let i = 0; i < MAX_FAILED_LOGINS; i++)
      await expect(svc.stepUp(WHO, { password: 'nope' }, '1.2.3.4')).rejects.toThrow();
    pw.verifyPassword.mockResolvedValue(true);
    await expect(svc.stepUp(WHO, { password: 'pw' }, '1.2.3.4')).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    // shared with sign-in: the same address cannot log in to that account either
    await expect(svc.login('ann', 'pw', { ip: '1.2.3.4' })).rejects.toThrow(UnauthorizedException);
  });

  it('needs a session (an API token cannot step up)', async () => {
    const { svc, sessions } = build();
    await expect(svc.stepUp({ userId: 7, username: 'ann' }, { password: 'pw' })).rejects.toThrow(ForbiddenException);
    expect(sessions.elevate).not.toHaveBeenCalled();
  });
});

describe('AuthService with two-factor authentication', () => {
  const MFA_USER = { ...USER, totpEnabledAt: new Date('2026-01-01') };
  const WHO = { userId: 7, username: 'ann', sessionId: 55 };

  it('a right password only yields a short-lived challenge, no session', async () => {
    const { svc, sessions, jwt } = build({ user: { ...MFA_USER } });
    const res = await svc.login('ann', 'pw', { ip: '1.2.3.4' });
    expect(res).toEqual({ mfaRequired: true, mfaToken: 'jwt' });
    expect(sessions.create).not.toHaveBeenCalled();
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 7, purpose: 'mfa-login', jti: expect.stringMatching(/^[0-9a-f]{32}$/) },
      { expiresIn: '5m' },
    );
  });

  it('a wrong password never reaches the code step', async () => {
    const { svc, jwt } = build({ user: { ...MFA_USER } });
    pw.verifyPassword.mockResolvedValue(false);
    await expect(svc.login('ann', 'nope')).rejects.toThrow(UnauthorizedException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('the challenge plus a valid code opens the session', async () => {
    const { svc, sessions, mfa } = build({ user: { ...MFA_USER } });
    const res = await svc.loginWithCode('challenge', '123456', { ip: '1.2.3.4' });
    expect(mfa.verify).toHaveBeenCalledWith(7, '123456');
    expect(sessions.create).toHaveBeenCalledWith(7, { ip: '1.2.3.4' });
    expect(res).toEqual({ access_token: 'jwt', expires_in: 900, refreshToken: 'rt' });
  });

  it('a challenge opens one session only', async () => {
    const { svc, sessions } = build({ user: { ...MFA_USER } });
    await svc.loginWithCode('challenge', '123456', { ip: '1.2.3.4' });
    await expect(svc.loginWithCode('challenge', '654321', { ip: '1.2.3.4' })).rejects.toThrow(UnauthorizedException);
    expect(sessions.create).toHaveBeenCalledTimes(1);
  });

  it('a wrong code does not use up the challenge', async () => {
    const { svc, mfa, sessions } = build({ user: { ...MFA_USER } });
    mfa.verify.mockResolvedValueOnce(null);
    await expect(svc.loginWithCode('challenge', '000000')).rejects.toThrow(UnauthorizedException);
    await svc.loginWithCode('challenge', '123456');
    expect(sessions.create).toHaveBeenCalledTimes(1);
  });

  it('refuses a challenge without an id', async () => {
    const { svc, jwt, sessions } = build({ user: { ...MFA_USER } });
    jwt.verify.mockReturnValue({ sub: 7, purpose: 'mfa-login' });
    await expect(svc.loginWithCode('old-style', '123456')).rejects.toThrow(UnauthorizedException);
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('refuses a token made for something else (e.g. an access token)', async () => {
    const { svc, jwt, sessions } = build({ user: { ...MFA_USER } });
    jwt.verify.mockReturnValue({ sub: 7, sid: 55 });
    await expect(svc.loginWithCode('access', '123456')).rejects.toThrow(UnauthorizedException);
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('refuses an expired or forged challenge', async () => {
    const { svc, jwt } = build({ user: { ...MFA_USER } });
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    await expect(svc.loginWithCode('old', '123456')).rejects.toThrow(UnauthorizedException);
  });

  it('wrong codes count toward both lockouts and then block even a right code', async () => {
    const { svc, mfa, users, sessions } = build({ user: { ...MFA_USER } });
    mfa.verify.mockResolvedValue(null);
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
      await expect(svc.loginWithCode('c', '000000', { ip: '1.2.3.4' })).rejects.toThrow(UnauthorizedException);
    }
    expect(users.recordFailedLogin).toHaveBeenCalledTimes(MAX_FAILED_LOGINS);
    mfa.verify.mockResolvedValue('totp');
    await expect(svc.loginWithCode('c', '123456', { ip: '1.2.3.4' })).rejects.toThrow(UnauthorizedException);
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('a locked account cannot finish signing in', async () => {
    const { svc, sessions } = build({ user: { ...MFA_USER, isLocked: true } });
    await expect(svc.loginWithCode('c', '123456')).rejects.toThrow(UnauthorizedException);
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('step-up takes a code from the app, not the password and not a recovery code', async () => {
    const { svc, sessions, mfa } = build({ user: { ...MFA_USER } });
    await expect(svc.stepUp(WHO, { password: 'pw' })).rejects.toThrow(BadRequestException);
    expect(sessions.elevate).not.toHaveBeenCalled();
    await svc.stepUp(WHO, { code: '123456' });
    expect(mfa.verify).toHaveBeenCalledWith(7, '123456', { allowRecovery: false });
    expect(sessions.elevate).toHaveBeenCalled();
  });

  it('step-up with a wrong code is refused', async () => {
    const { svc, sessions, mfa } = build({ user: { ...MFA_USER } });
    mfa.verify.mockResolvedValue(null);
    await expect(svc.stepUp(WHO, { code: '000000' })).rejects.toThrow(BadRequestException);
    expect(sessions.elevate).not.toHaveBeenCalled();
  });
});

describe('AuthService password reset', () => {
  it('stores only a hash of the token and emails the raw token', async () => {
    const { svc, resets, mail } = build();
    await svc.requestPasswordReset('ann@example.com');
    await new Promise((r) => setImmediate(r)); // the mail is sent in the background, after the app-name lookup
    expect(mail.send.mock.calls[0][0].subject).toBe('Reset your Acme password');
    const stored = resets.save.mock.calls[0][0];
    const sent: string = mail.send.mock.calls[0][0].text;
    const raw = /token=([0-9a-f]{64})/.exec(sent)![1];
    expect(stored.token).toBe(sha256(raw));
    expect(stored.token).not.toBe(raw);
  });

  it("writes the reset email in the recipient's own language", async () => {
    const { svc, mail } = build({ user: { ...USER, language: 'cs' } });
    await svc.requestPasswordReset('ann@example.com');
    await new Promise((r) => setImmediate(r));
    expect(mail.send.mock.calls[0][0].subject).toBe('Obnovení hesla v aplikaci Acme');
    expect(mail.send.mock.calls[0][0].text).toContain('Dobrý den, ann');
  });

  it('stays silent for unknown addresses', async () => {
    const { svc, mail, resets } = build({ user: null });
    await expect(svc.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
    expect(mail.send).not.toHaveBeenCalled();
    expect(resets.save).not.toHaveBeenCalled();
  });

  it('resets the password, is single use, and signs the user out everywhere', async () => {
    const { svc, resets, users, sessions } = build();
    resets.findOne.mockResolvedValue({
      id: 1,
      user: { id: 7, username: 'ann' },
      expiresAt: new Date(Date.now() + 60_000),
    });
    await svc.resetPassword('rawtoken', 'new-password-1');
    expect(resets.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { token: sha256('rawtoken') } }));
    expect(users.update).toHaveBeenCalledWith(7, { password: 'new-password-1', isEmailConfirmed: true });
    expect(users.resetLoginState).toHaveBeenCalledWith(7);
    expect(resets.delete).toHaveBeenCalledWith({ user: { id: 7 } });
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(7);
  });

  it('a token already claimed by a concurrent request is rejected', async () => {
    const { svc, resets, users } = build();
    resets.findOne.mockResolvedValue({ id: 1, user: { id: 7 }, expiresAt: new Date(Date.now() + 60_000) });
    resets.delete.mockResolvedValueOnce({ affected: 0 });
    await expect(svc.resetPassword('raw', 'new-password-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('rejects unknown and expired tokens', async () => {
    const { svc, resets, users } = build();
    resets.findOne.mockResolvedValue(null);
    await expect(svc.resetPassword('x', 'new-password-1')).rejects.toBeInstanceOf(BadRequestException);
    resets.findOne.mockResolvedValue({ id: 2, user: { id: 7 }, expiresAt: new Date(Date.now() - 1000) });
    await expect(svc.resetPassword('x', 'new-password-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(users.update).not.toHaveBeenCalled();
  });
});

describe('AuthService.sendInvite', () => {
  const invitee = { id: 9, username: 'neo', email: 'neo@example.com', language: 'cs' };

  it('replaces older links, stores only a hash valid for 72 hours and marks the invite as sent', async () => {
    const { svc, resets, users, mail } = build();
    const before = Date.now();
    const { delivered, link } = await svc.sendInvite(invitee);
    expect(delivered).toBe(true);
    expect(resets.delete).toHaveBeenCalledWith({ user: { id: 9 } });
    const stored = resets.save.mock.calls[0][0];
    const raw = /token=([0-9a-f]{64})/.exec(link)![1];
    expect(link).toContain('/user/password-reset?');
    expect(link).toContain('invite=1');
    expect(stored.token).toBe(sha256(raw));
    expect((stored.expiresAt as Date).getTime()).toBeGreaterThanOrEqual(before + INVITE_TTL_MS);
    expect(users.markInvited).toHaveBeenCalledWith(9);
    expect(mail.send.mock.calls[0][0]).toMatchObject({ to: 'neo@example.com' });
    expect(mail.send.mock.calls[0][0].text).toContain(link);
  });

  it("is written in the invitee's language", async () => {
    const { svc, mail } = build();
    await svc.sendInvite(invitee);
    expect(mail.send.mock.calls[0][0].subject).toBe('Pozvánka do aplikace Acme');
    await svc.sendInvite({ ...invitee, language: 'en' });
    expect(mail.send.mock.calls[1][0].subject).toBe('You have been invited to Acme');
  });

  it('reports when the mail could not be delivered', async () => {
    const { svc, mail } = build();
    mail.send.mockResolvedValueOnce(false);
    expect((await svc.sendInvite(invitee)).delivered).toBe(false);
  });
});

describe('AuthService.refresh / logout', () => {
  it('re-reads the user (role comes from the DB) and returns the rotated token', async () => {
    const { svc, sessions } = build();
    sessions.rotate.mockResolvedValue({ session: { id: 55, userId: 7 }, refreshToken: 'rt2' });
    await expect(svc.refresh('rt1')).resolves.toMatchObject({ refreshToken: 'rt2', access_token: 'jwt' });
  });

  it('revokes the session if the user no longer exists', async () => {
    const { svc, sessions } = build({ user: null });
    sessions.rotate.mockResolvedValue({ session: { id: 55, userId: 7 }, refreshToken: 'rt2' });
    await expect(svc.refresh('rt1')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.revokeById).toHaveBeenCalledWith(55);
  });

  it('logout revokes by refresh token', async () => {
    const { svc, sessions } = build();
    await svc.logout(undefined, 'rt1');
    expect(sessions.revokeByRefreshToken).toHaveBeenCalledWith('rt1');
  });
});
