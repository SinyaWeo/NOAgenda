import * as crypto from 'crypto';

/** Opaque random token (hex). Only its hash is ever stored. */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** SHA-256 hex digest. Right for high-entropy random tokens (not for passwords). */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
