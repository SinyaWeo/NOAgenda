import { base32Decode, base32Encode, generateTotpSecret, matchTotp, totpCode, totpStep, totpUri } from '../totp';

/** RFC 6238 appendix B uses the ASCII key "12345678901234567890" for SHA-1. */
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('totp', () => {
  it.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ])('matches the RFC 6238 test vector at t=%i', (t, expected) => {
    expect(totpCode(RFC_SECRET, Math.floor(t / 30), 8)).toBe(expected);
  });

  it('base32 round-trips and tolerates spaces, dashes and lower case', () => {
    const buf = Buffer.from('any bytes \x00\xff here');
    expect(base32Decode(base32Encode(buf))).toEqual(buf);
    expect(base32Decode('jbsw y3dp-ehpk 3pxp')).toEqual(base32Decode('JBSWY3DPEHPK3PXP'));
    expect(() => base32Decode('not base32!')).toThrow();
  });

  it('new secrets are 160-bit base32 and differ', () => {
    const a = generateTotpSecret();
    expect(a).toMatch(/^[A-Z2-7]{32}$/);
    expect(a).not.toBe(generateTotpSecret());
  });

  describe('matchTotp', () => {
    const secret = generateTotpSecret();
    const now = 1_800_000_000_000;
    const step = totpStep(now);

    it('accepts the current code and one step either side', () => {
      expect(matchTotp(secret, totpCode(secret, step), null, now)).toBe(step);
      expect(matchTotp(secret, totpCode(secret, step - 1), null, now)).toBe(step - 1);
      expect(matchTotp(secret, totpCode(secret, step + 1), null, now)).toBe(step + 1);
    });

    it('refuses codes further away, malformed codes and other secrets', () => {
      expect(matchTotp(secret, totpCode(secret, step - 2), null, now)).toBeNull();
      expect(matchTotp(secret, totpCode(secret, step + 2), null, now)).toBeNull();
      expect(matchTotp(secret, '12345', null, now)).toBeNull();
      expect(matchTotp(secret, 'abcdef', null, now)).toBeNull();
      expect(matchTotp(generateTotpSecret(), totpCode(secret, step), null, now)).toBeNull();
    });

    it('ignores spaces in the code', () => {
      const code = totpCode(secret, step);
      expect(matchTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`, null, now)).toBe(step);
    });

    it('refuses a code that was already used, or an older one (replay)', () => {
      expect(matchTotp(secret, totpCode(secret, step), step, now)).toBeNull();
      expect(matchTotp(secret, totpCode(secret, step - 1), step, now)).toBeNull();
      expect(matchTotp(secret, totpCode(secret, step + 1), step, now)).toBe(step + 1);
    });
  });

  it('builds the otpauth URI authenticator apps read', () => {
    const uri = totpUri('JBSWY3DPEHPK3PXP', 'ann', 'My App');
    expect(uri.startsWith('otpauth://totp/My%20App%3Aann?')).toBe(true);
    const params = new URL(uri).searchParams;
    expect(params.get('secret')).toBe('JBSWY3DPEHPK3PXP');
    expect(params.get('issuer')).toBe('My App');
    expect(params.get('digits')).toBe('6');
    expect(params.get('period')).toBe('30');
  });
});
