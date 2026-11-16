import * as bcrypt from 'bcrypt'; // native: runs on libuv worker threads, never blocks the event loop

/** bcrypt work factor. Existing hashes with a lower cost are upgraded on the next successful login. */
export const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

/** True if the stored hash was made with a lower cost than we use now. */
export function needsRehash(hash: string): boolean {
  const cost = Number(/^\$2[abxy]\$(\d{2})\$/.exec(hash)?.[1]);
  return !Number.isFinite(cost) || cost < BCRYPT_COST;
}

let dummyHash: Promise<string> | undefined;

/**
 * Compare against the real hash, or against a throwaway hash of the same cost when
 * the user does not exist, so both cases take the same time (no username probing).
 */
export async function verifyPassword(plain: string, hash: string | undefined): Promise<boolean> {
  dummyHash ??= bcrypt.hash('not-a-real-password', BCRYPT_COST);
  const ok = await bcrypt.compare(plain, hash ?? (await dummyHash));
  return hash !== undefined && ok;
}
