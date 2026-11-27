import { realTranslator } from '../../../i18n/__tests__/fake-i18n';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as password from '../../../common/password';
import { secretBox } from '../../../common/secret-box';
import { totpCode, totpStep, generateTotpSecret } from '../../../common/totp';
import { MfaService, RECOVERY_CODE_COUNT } from '../mfa.service';
import type { Repository } from 'typeorm';
import type { User } from '../../user/user.entity';
import type { SessionService } from '../../session/session.service';
import type { MailService } from '../../mail/mail.service';
import { asMock } from '../../../common/__tests__/test-utils';

jest.mock('../../../common/password');

/** How MfaService stores a (normalized) recovery code. */
const mac = (code: string) => secretBox().mac(code, 'users.totpRecoveryCodes');
const pw = password as jest.Mocked<typeof password>;

interface Row {
  id: number;
  username: string;
  email: string;
  language: string | null;
  password: string;
  totpSecret: string | null;
  totpEnabledAt: Date | null;
  totpLastStep: number | null;
  totpRecoveryCodes: string | null;
}

/** An in-memory `users` row behind the bits of the repository MfaService uses. */
function build(start: Partial<Row> = {}, opts: { required?: boolean } = {}) {
  const row: Row = {
    id: 7,
    username: 'ann',
    email: 'ann@example.com',
    language: 'en',
    password: 'HASH',
    totpSecret: null,
    totpEnabledAt: null,
    totpLastStep: null,
    totpRecoveryCodes: null,
    ...start,
  };
  const qb = () => {
    const state: { set?: Partial<Row>; where?: string; params?: Record<string, unknown> } = {};
    const b = {
      addSelect: () => b,
      where: (w: string, p: Record<string, unknown>) => ((state.where = w), (state.params = p), b),
      getOne: async () => ({ ...row }),
      update: () => b,
      set: (v: Partial<Row>) => ((state.set = v), b),
      execute: async () => {
        // The compare-and-set conditions MfaService relies on.
        const p = state.params ?? {};
        if (state.where?.includes('totpLastStep <') && row.totpLastStep !== null && row.totpLastStep >= Number(p.step))
          return { affected: 0 };
        if (state.where?.includes('totpRecoveryCodes = :old') && row.totpRecoveryCodes !== p.old)
          return { affected: 0 };
        Object.assign(row, state.set);
        return { affected: 1 };
      },
    };
    return b;
  };
  const users = {
    createQueryBuilder: jest.fn(qb),
    update: jest.fn(async (_id: number, v: Partial<Row>) => void Object.assign(row, v)),
    findOne: jest.fn(async () => ({ id: row.id, totpEnabledAt: row.totpEnabledAt })),
    query: jest.fn(async () => [{ required: opts.required ? 1 : 0 }]),
  };
  const sessions = { revokeAllForUser: jest.fn(async () => undefined) };
  const mail = { send: jest.fn(async () => true), appName: jest.fn(async () => 'Acme') };
  const svc = new MfaService(
    asMock<Repository<User>>(users),
    asMock<SessionService>(sessions),
    asMock<MailService>(mail),
    realTranslator(),
  );
  return { svc, row, users, sessions, mail };
}

const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  jest.resetAllMocks();
  pw.verifyPassword.mockResolvedValue(true);
});

describe('MfaService setup and enable', () => {
  it('setup needs the password and stores a secret, but 2FA stays off until confirmed', async () => {
    const { svc, row } = build();
    const { secret, uri } = await svc.setup(7, 'pw');
    expect(row.totpSecret).toBe(secret);
    expect(row.totpEnabledAt).toBeNull();
    expect(uri).toContain('otpauth://totp/Acme%3Aann?');
    pw.verifyPassword.mockResolvedValue(false);
    await expect(svc.setup(7, 'bad')).rejects.toThrow(BadRequestException);
  });

  it('enable with a right code turns 2FA on, returns recovery codes once, signs out other sessions and tells the owner', async () => {
    const { svc, row, sessions, mail } = build();
    const { secret } = await svc.setup(7, 'pw');
    const { recoveryCodes } = await svc.enable(7, totpCode(secret, totpStep()), 55);
    expect(row.totpEnabledAt).toBeInstanceOf(Date);
    expect(recoveryCodes).toHaveLength(RECOVERY_CODE_COUNT);
    expect(new Set(recoveryCodes).size).toBe(RECOVERY_CODE_COUNT);
    // stored only as hashes
    expect(row.totpRecoveryCodes).not.toContain(recoveryCodes[0]);
    const stored: string[] = JSON.parse(row.totpRecoveryCodes as string);
    expect(stored.every((h) => h.startsWith('mac:v1:'))).toBe(true);
    expect(
      stored.some((h) => secretBox().macMatches(h, recoveryCodes[0].replace('-', ''), 'users.totpRecoveryCodes')),
    ).toBe(true);
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(7, 55);
    await flush();
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'ann@example.com' }));
  });

  it('enable refuses a wrong code, a missing setup and a second time', async () => {
    const fresh = build();
    await expect(fresh.svc.enable(7, '123456')).rejects.toThrow(BadRequestException);
    const { svc, row } = build({ totpSecret: generateTotpSecret() });
    await expect(svc.enable(7, '000000')).rejects.toThrow(BadRequestException);
    row.totpEnabledAt = new Date();
    await expect(svc.enable(7, totpCode(row.totpSecret as string, totpStep()))).rejects.toThrow(ConflictException);
  });
});

describe('MfaService.verify', () => {
  async function enabled() {
    const b = build();
    const { secret } = await b.svc.setup(7, 'pw');
    // enable with the previous step's code, so the current one is still unused
    const { recoveryCodes } = await b.svc.enable(7, totpCode(secret, totpStep() - 1));
    return { ...b, secret, recoveryCodes };
  }

  it('accepts a code from the app only once', async () => {
    const { svc, secret } = await enabled();
    const code = totpCode(secret, totpStep());
    expect(await svc.verify(7, code)).toBe('totp');
    expect(await svc.verify(7, code)).toBeNull();
  });

  it('accepts each recovery code once, in any case and with or without the dash', async () => {
    const { svc, recoveryCodes } = await enabled();
    expect(await svc.verify(7, recoveryCodes[0].toUpperCase().replace('-', ' '))).toBe('recovery');
    expect(await svc.verify(7, recoveryCodes[0])).toBeNull();
    expect((await svc.status(7)).recoveryCodesLeft).toBe(RECOVERY_CODE_COUNT - 1);
  });

  it('does not take recovery codes where they are not allowed', async () => {
    const { svc, recoveryCodes } = await enabled();
    expect(await svc.verify(7, recoveryCodes[0], { allowRecovery: false })).toBeNull();
  });

  it('nothing matches while 2FA is off', async () => {
    const { svc } = build({ totpSecret: generateTotpSecret() });
    expect(await svc.verify(7, '123456')).toBeNull();
  });
});

describe('MfaService disable, regenerate, admin reset', () => {
  it('disable needs the password and a code, clears everything and signs out other sessions', async () => {
    const secret = generateTotpSecret();
    const { svc, row, sessions } = build({ totpSecret: secret, totpEnabledAt: new Date() });
    pw.verifyPassword.mockResolvedValueOnce(false);
    await expect(svc.disable(7, 'bad', totpCode(secret, totpStep()))).rejects.toThrow(BadRequestException);
    await expect(svc.disable(7, 'pw', '000000')).rejects.toThrow(BadRequestException);
    await svc.disable(7, 'pw', totpCode(secret, totpStep()), 55);
    expect(row).toMatchObject({ totpSecret: null, totpEnabledAt: null, totpRecoveryCodes: null });
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(7, 55);
  });

  it('cannot be switched off while an admin setting or a team requires it (and no recovery code is used up)', async () => {
    const secret = generateTotpSecret();
    const hashes = JSON.stringify([mac('aaaaabbbbb')]);
    const { svc, row } = build(
      { totpSecret: secret, totpEnabledAt: new Date(), totpRecoveryCodes: hashes },
      { required: true },
    );
    await expect(svc.disable(7, 'pw', 'aaaaa-bbbbb')).rejects.toThrow(ForbiddenException);
    expect(row.totpEnabledAt).not.toBeNull();
    expect(row.totpRecoveryCodes).toBe(hashes);
  });

  it('new recovery codes replace the old ones (a code from the app needed)', async () => {
    const secret = generateTotpSecret();
    const { svc, row } = build({
      totpSecret: secret,
      totpEnabledAt: new Date(),
      totpRecoveryCodes: JSON.stringify([mac('aaaaabbbbb')]),
    });
    await expect(svc.regenerateRecoveryCodes(7, 'aaaaa-bbbbb')).rejects.toThrow(BadRequestException);
    const { recoveryCodes } = await svc.regenerateRecoveryCodes(7, totpCode(secret, totpStep()));
    expect(recoveryCodes).toHaveLength(RECOVERY_CODE_COUNT);
    expect(row.totpRecoveryCodes).not.toContain(mac('aaaaabbbbb'));
  });

  it('admin reset clears 2FA and tells the user', async () => {
    const { svc, row, mail } = build({ totpSecret: generateTotpSecret(), totpEnabledAt: new Date() });
    await svc.adminReset(7);
    expect(row.totpEnabledAt).toBeNull();
    await flush();
    expect(mail.send).toHaveBeenCalled();
  });

  it('status reports whether 2FA is required', async () => {
    expect((await build({}, { required: true }).svc.status(7)).required).toBe(true);
    expect((await build().svc.status(7)).required).toBe(false);
  });
});
