import { createHash, timingSafeEqual } from 'crypto';
import { ForbiddenException } from '@nestjs/common';

/**
 * Who may register. Defaults to everyone; two optional switches for a soft launch:
 *   REGISTRATION_ENABLED=false       nobody can register (existing users are unaffected)
 *   REGISTRATION_INVITE_CODE=<code>  registering requires this code (share it with the people you invite)
 * Use a long random invite code (e.g. `openssl rand -hex 12`): guesses are rate-limited per IP but not unlimited.
 */
export function registrationPolicy(env: NodeJS.ProcessEnv = process.env) {
  return {
    enabled: env.REGISTRATION_ENABLED !== 'false',
    inviteRequired: !!env.REGISTRATION_INVITE_CODE,
  };
}

const digest = (v: string) => createHash('sha256').update(v).digest();

/** Throws 403 unless the caller is allowed to register under the current policy. */
export function assertMayRegister(inviteCode: string | undefined, env: NodeJS.ProcessEnv = process.env): void {
  if (env.REGISTRATION_ENABLED === 'false') {
    throw new ForbiddenException('Registration is closed');
  }
  const required = env.REGISTRATION_INVITE_CODE;
  if (required) {
    // Compare hashes in constant time (also hides the code's length).
    if (!timingSafeEqual(digest(inviteCode ?? ''), digest(required))) {
      throw new ForbiddenException('A valid invite code is required to register');
    }
  }
}
