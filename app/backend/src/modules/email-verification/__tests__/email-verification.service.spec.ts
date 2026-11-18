import { asMock, Mocks } from '../../../common/__tests__/test-utils';
import { EmailVerificationService } from '../email-verification.service';
import { realTranslator } from '../../../i18n/__tests__/fake-i18n';

function build() {
  const tokens: Mocks = { delete: jest.fn(async () => ({})), create: jest.fn((x) => x), save: jest.fn(async (x) => x) };
  const mail: { appName: jest.Mock; link: jest.Mock; send: jest.Mock; enabled: boolean } = {
    appName: jest.fn(async () => 'Acme'),
    link: jest.fn((p: string, q: Record<string, string>) => `https://app${p}?token=${q.token}`),
    send: jest.fn(async () => true),
    enabled: true,
  };
  return { svc: new EmailVerificationService(asMock(tokens), asMock({}), asMock(mail), realTranslator()), mail };
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
