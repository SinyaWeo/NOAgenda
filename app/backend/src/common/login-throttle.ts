/**
 * Failed-login counter per (username, client IP), kept in memory.
 *
 * The point of keying by IP as well as by name: a locked pair only blocks THAT address from
 * guessing THAT account. Someone hammering a known username from their own IP locks themselves
 * out, not the real owner, who connects from elsewhere. (A distributed attack is covered by the
 * separate per-account threshold in AuthService.)
 *
 * Entries disappear on their own once the lock window has passed, and the map has a hard size
 * cap so a flood of random usernames cannot grow it without bound.
 */
export class LoginThrottle {
  private readonly entries = new Map<string, { failures: number; lastAt: number; lockedUntil: number }>();

  constructor(
    private readonly maxFailures: number,
    private readonly lockMs: number,
    private readonly now: () => number = Date.now,
    private readonly maxEntries = 10_000,
  ) {}

  private key(username: string, ip: string | undefined): string {
    return `${username.trim().toLowerCase()}|${ip ?? ''}`;
  }

  isLocked(username: string, ip: string | undefined): boolean {
    const e = this.entries.get(this.key(username, ip));
    if (!e) return false;
    if (e.lockedUntil > this.now()) return true;
    // Window over: forget the entry (a lock that ended, or old failures that never reached the limit).
    if (this.now() - e.lastAt > this.lockMs) this.entries.delete(this.key(username, ip));
    return false;
  }

  recordFailure(username: string, ip: string | undefined): void {
    const k = this.key(username, ip);
    const t = this.now();
    const prev = this.entries.get(k);
    const stale = !prev || t - prev.lastAt > this.lockMs;
    const failures = (stale ? 0 : prev.failures) + 1;
    this.entries.delete(k); // re-insert so Map iteration order = least recently touched first
    this.entries.set(k, { failures, lastAt: t, lockedUntil: failures >= this.maxFailures ? t + this.lockMs : 0 });
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value as string);
  }

  /** Successful sign-in from this address. */
  clear(username: string, ip: string | undefined): void {
    this.entries.delete(this.key(username, ip));
  }

  /** Password reset: forget every address's failures for this account. */
  clearUser(username: string | undefined): void {
    if (!username) return;
    const prefix = `${username.trim().toLowerCase()}|`;
    for (const k of [...this.entries.keys()]) if (k.startsWith(prefix)) this.entries.delete(k);
  }
}
