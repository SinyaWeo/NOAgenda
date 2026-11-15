import { ForbiddenException } from '@nestjs/common';
import { assertMayRegister, registrationPolicy } from '../registration';

const env = (o: Record<string, string>) => o as NodeJS.ProcessEnv;

describe('registration policy', () => {
  it('is open to everyone by default', () => {
    expect(registrationPolicy(env({}))).toEqual({ enabled: true, inviteRequired: false });
    expect(() => assertMayRegister(undefined, env({}))).not.toThrow();
  });

  it('can be closed completely', () => {
    expect(registrationPolicy(env({ REGISTRATION_ENABLED: 'false' })).enabled).toBe(false);
    expect(() => assertMayRegister('anything', env({ REGISTRATION_ENABLED: 'false' }))).toThrow(ForbiddenException);
    // an invite code does not reopen a closed door
    expect(() => assertMayRegister('abc', env({ REGISTRATION_ENABLED: 'false', REGISTRATION_INVITE_CODE: 'abc' }))).toThrow(/closed/);
  });

  it('only the literal string "false" closes it (typos do not lock you out silently)', () => {
    expect(registrationPolicy(env({ REGISTRATION_ENABLED: '' })).enabled).toBe(true);
    expect(registrationPolicy(env({ REGISTRATION_ENABLED: 'no' })).enabled).toBe(true);
  });

  describe('with an invite code', () => {
    const e = env({ REGISTRATION_INVITE_CODE: 's3cret-invite' });

    it('advertises that a code is needed without revealing it', () => {
      expect(registrationPolicy(e)).toEqual({ enabled: true, inviteRequired: true });
    });
    it('accepts the right code', () => {
      expect(() => assertMayRegister('s3cret-invite', e)).not.toThrow();
    });
    it.each([undefined, '', 'wrong', 's3cret-invite ', 'S3CRET-INVITE', 's3cret-invit'])('rejects %p', (code) => {
      expect(() => assertMayRegister(code as any, e)).toThrow(ForbiddenException);
    });
  });
});
