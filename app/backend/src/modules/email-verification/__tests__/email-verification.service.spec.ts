import { ConflictException } from '@nestjs/common';
import { asMock, Mocks } from '../../../common/__tests__/test-utils';
import { EmailVerificationService } from '../email-verification.service';
import { realTranslator } from '../../../i18n/__tests__/fake-i18n';

const HOUR = 60 * 60 * 1000;
const ann = { id: 1, email: 'old@x.com', username: 'ann', language: 'en' };

function build(opts: { mailEnabled?: boolean } = {}) {
  const tokens: Mocks = {
    delete: jest.fn(async () => ({})),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => x),
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
  };
  const users: Mocks = { update: jest.fn(async () => ({})), findOne: jest.fn(async () => null) };
  const mail: { appName: jest.Mock; link: jest.Mock; send: jest.Mock; enabled: boolean } = {
    appName: jest.fn(async () => 'Acme'),
    link: jest.fn((p: string, q: Record<string, string>) => `https://app${p}?token=${q.token}`),
    send: jest.fn(async () => true),
    enabled: opts.mailEnabled ?? true,
  };
  const svc = new EmailVerificationService(asMock(tokens), asMock(users), asMock(mail), realTranslator());
  return { svc, mail, tokens, users };
}

describe('EmailVerificationService.send', () => {
  it("writes the email in the recipient's language", async () => {
    const { svc, mail } = build();
    await svc.send({ id: 1, email: 'a@x.cz', username: 'ann', language: 'cs' });
    const msg = mail.send.mock.calls[0][0];
    expect(msg.subject).toBe('Potvrďte svou e-mailovou adresu v aplikaci Acme');
    expect(msg.text).toContain('Dobrý den, ann');
    expect(msg.text).toMatch(/https:\/\/app\/user\/verify-email\?token=[0-9a-f]{64}/);
  });

  it('uses English when the language is unknown or unset', async () => {
    const { svc, mail } = build();
    await svc.send({ id: 1, email: 'a@x.com', username: 'ann' });
    await svc.send({ id: 1, email: 'a@x.com', username: 'ann', language: 'de' });
    for (const [msg] of mail.send.mock.calls) {
      expect(msg.subject).toBe('Confirm your Acme email address');
      expect(msg.text).toContain('Hi ann,');
    }
  });
});

describe('EmailVerificationService.requestChange', () => {
  it('keeps the current address and mails a link to the new one', async () => {
    const { svc, mail, tokens, users } = build();
    expect(await svc.requestChange(ann, 'new@x.com')).toBe(true);
    expect(users.update).not.toHaveBeenCalled();
    expect(tokens.save).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@x.com' }));
    const msg = mail.send.mock.calls[0][0];
    expect(msg.to).toBe('new@x.com');
    expect(msg.subject).toBe('Confirm your new Acme email address');
  });

  it('changes the address at once when mail cannot be delivered', async () => {
    const { svc, mail, users } = build({ mailEnabled: false });
    expect(await svc.requestChange(ann, 'new@x.com')).toBe(false);
    expect(users.update).toHaveBeenCalledWith(1, { email: 'new@x.com' });
    expect(mail.send).not.toHaveBeenCalled();
  });
});

describe('EmailVerificationService.pendingEmail / cancelChange', () => {
  const live = [
    { id: 7, email: 'old@x.com', expiresAt: new Date(Date.now() + HOUR) },
    { id: 8, email: 'new@x.com', expiresAt: new Date(Date.now() + HOUR) },
  ];

  it('reports a live token for another address as pending', async () => {
    const { svc, tokens } = build();
    tokens.find.mockResolvedValue(live);
    expect(await svc.pendingEmail(ann)).toBe('new@x.com');
  });

  it('ignores expired change tokens', async () => {
    const { svc, tokens } = build();
    tokens.find.mockResolvedValue([{ id: 8, email: 'new@x.com', expiresAt: new Date(Date.now() - HOUR) }]);
    expect(await svc.pendingEmail(ann)).toBeNull();
  });

  it('cancelling deletes only the change tokens', async () => {
    const { svc, tokens } = build();
    tokens.find.mockResolvedValue(live);
    await svc.cancelChange(ann);
    expect(tokens.delete).toHaveBeenCalledWith([8]);
  });
});

describe('EmailVerificationService.verify', () => {
  const record = (email: string) => ({
    id: 5,
    email,
    expiresAt: new Date(Date.now() + HOUR),
    user: { ...ann },
  });

  it('confirms the current address without touching anything else', async () => {
    const { svc, tokens, users, mail } = build();
    tokens.findOne.mockResolvedValue(record('old@x.com'));
    await svc.verify('tok');
    expect(users.update).toHaveBeenCalledWith(1, { email: 'old@x.com', isEmailConfirmed: true });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('switches to the new address only now, and tells the old one', async () => {
    const { svc, tokens, users, mail } = build();
    tokens.findOne.mockResolvedValue(record('new@x.com'));
    await svc.verify('tok');
    expect(users.update).toHaveBeenCalledWith(1, { email: 'new@x.com', isEmailConfirmed: true });
    const msg = mail.send.mock.calls[0][0];
    expect(msg.to).toBe('old@x.com');
    expect(msg.text).toContain('new@x.com');
  });

  it('refuses when another account took the address meanwhile', async () => {
    const { svc, tokens, users } = build();
    tokens.findOne.mockResolvedValue(record('new@x.com'));
    users.findOne.mockResolvedValue({ id: 2, email: 'new@x.com' });
    await expect(svc.verify('tok')).rejects.toBeInstanceOf(ConflictException);
    expect(users.update).not.toHaveBeenCalled();
  });
});
