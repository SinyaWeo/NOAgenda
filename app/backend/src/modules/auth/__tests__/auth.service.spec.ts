import { realTranslator } from '../../../i18n/__tests__/fake-i18n';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService, MAX_FAILED_LOGINS, ACCOUNT_LOCK_THRESHOLD } from '../auth.service';
import * as password from '../../../common/password';
import { sha256 } from '../../../common/tokens';

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

function build(over: { user?: any; verificationRequired?: boolean } = {}) {
  const user = over.user === undefined ? { ...USER } : over.user;
  const users: any = {
    findByUsername: jest.fn(async () => user),
    findByEmail: jest.fn(async () => user),
    findById: jest.fn(async () => user),
    recordFailedLogin: jest.fn(),
    resetLoginState: jest.fn(),
    setPasswordHash: jest.fn(),
    update: jest.fn(),
  };
  const jwt: any = {
    sign: jest.fn(() => 'jwt'),
    decode: jest.fn(() => ({ iat: 100, exp: 1000 })),
  };
  const resets: any = {
    delete: jest.fn(async () => ({ affected: 1 })),
    save: jest.fn(async (x) => x),
    create: jest.fn((x) => x),
    findOne: jest.fn(),
  };
  const sessions: any = {
    create: jest.fn(async () => ({ session: { id: 55 }, refreshToken: 'rt' })),
    rotate: jest.fn(),
    revokeAllForUser: jest.fn(),
    revokeById: jest.fn(),
    revokeByRefreshToken: jest.fn(),
    hasActiveSessionFromIp: jest.fn(async () => false),
  };
  const verification: any = { required: over.verificationRequired ?? false };
  const mail: any = {
    send: jest.fn(async () => true),
    appName: jest.fn(async () => 'Acme'),
    link: jest.fn((p, q) => `https://app${p}?token=${q.token}`),
  };
  const svc = new AuthService(users, jwt, resets, sessions, verification, mail, realTranslator());
  return { svc, users, jwt, resets, sessions, mail };
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
    expect((err.getResponse() as any).code).toBe('EMAIL_NOT_VERIFIED');
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
