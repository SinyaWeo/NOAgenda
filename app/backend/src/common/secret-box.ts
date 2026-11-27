import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { Logger } from '@nestjs/common';
import type { ValueTransformer } from 'typeorm';

/**
 * Reversible encryption for secrets the app has to read back (webhook signing secrets, plugin credentials).
 * Values it can only compare (passwords, API tokens) are hashed instead and never come here.
 *
 * AES-256-GCM, a fresh random nonce per value. The stored form is versioned and self-describing:
 *
 *   enc:v1:<key id>:<nonce>:<ciphertext + auth tag>        (nonce and ciphertext in base64url)
 *
 * so encrypted values can be told apart from legacy plain text, and from values made with an older key.
 * The prefix and a `context` (e.g. the table and column) are authenticated too, so a value copied into
 * another column does not decrypt there.
 *
 * Keys come from SECRETS_KEY: one or more base64 32-byte keys separated by commas, the newest first.
 * The first one encrypts; all of them decrypt (key rotation, see `npm run secrets:reencrypt`).
 * Generate one with `openssl rand -base64 32`. Keep it out of the database and out of the backups:
 * a stolen dump alone then reveals nothing, and a lost key means the encrypted values are lost.
 */

const PREFIX = 'enc';
/** Prefix of keyed hashes (`mac`), so they cannot be mistaken for encrypted values. */
const MAC_PREFIX = 'mac';
const VERSION = 'v1';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export interface SecretKey {
  /** Short public id derived from the key (first 8 hex chars of its SHA-256), stored with each value. */
  id: string;
  key: Buffer;
}

/** Derives the public id of a key; it says which key a value needs without revealing anything about it. */
export function keyId(key: Buffer): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 8);
}

/** Parses SECRETS_KEY. Throws on a value that is not a list of base64 32-byte keys. */
export function parseSecretKeys(value: string): SecretKey[] {
  const parts = value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) throw new Error('SECRETS_KEY is empty.');
  const keys = parts.map((p, i) => {
    const key = Buffer.from(p, 'base64');
    // base64 decoding ignores junk; re-encoding tells a real key from a typo or a placeholder.
    const canonical = (s: string) => s.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/');
    if (key.length !== KEY_BYTES || canonical(key.toString('base64')) !== canonical(p)) {
      throw new Error(
        `SECRETS_KEY entry ${i + 1} is not a base64-encoded 32-byte key. Generate one with: openssl rand -base64 32`,
      );
    }
    return { id: keyId(key), key };
  });
  const ids = new Set(keys.map((k) => k.id));
  if (ids.size !== keys.length) throw new Error('SECRETS_KEY lists the same key twice.');
  return keys;
}

/** True when `value` is in the encrypted form (whichever key or version). */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(`${PREFIX}:`);
}

export class SecretBox {
  private readonly byId: Map<string, Buffer>;
  /** Per key: a separate key for `mac`, derived with HKDF so hashing never uses the encryption key itself. */
  private readonly macKeys: Map<string, Buffer>;

  constructor(private readonly keys: SecretKey[]) {
    if (!keys.length) throw new Error('SecretBox needs at least one key.');
    this.byId = new Map(keys.map((k) => [k.id, k.key]));
    this.macKeys = new Map(
      keys.map((k) => [k.id, Buffer.from(hkdfSync('sha256', k.key, 'noagenda', 'keyed hash v1', KEY_BYTES))]),
    );
  }

  /** The id of the key new values are encrypted with. */
  get currentKeyId(): string {
    return this.keys[0].id;
  }

  encrypt(plain: string, context = ''): string {
    const { id, key } = this.keys[0];
    const header = `${PREFIX}:${VERSION}:${id}`;
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: TAG_BYTES });
    cipher.setAAD(aad(header, context));
    const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final(), cipher.getAuthTag()]);
    return `${header}:${nonce.toString('base64url')}:${body.toString('base64url')}`;
  }

  /**
   * Decrypts a stored value. Legacy plain text (anything not starting with `enc:`) is returned unchanged,
   * so values written before encryption keep working until they are migrated. Throws when the value was
   * made with a key that is not configured, or was altered.
   */
  decrypt(stored: string, context = ''): string {
    if (!isEncrypted(stored)) return stored;
    const parts = stored.split(':');
    if (parts.length !== 5 || parts[1] !== VERSION) {
      throw new Error(`Unsupported encrypted value format (${parts.slice(0, 2).join(':')}).`);
    }
    const [, , id, nonceText, bodyText] = parts;
    const key = this.byId.get(id);
    if (!key) {
      throw new Error(
        `A secret is encrypted with key ${id}, which is not in SECRETS_KEY. Add that key back (after the current one).`,
      );
    }
    const nonce = Buffer.from(nonceText, 'base64url');
    const body = Buffer.from(bodyText, 'base64url');
    if (nonce.length !== NONCE_BYTES || body.length < TAG_BYTES) throw new Error('Encrypted value is malformed.');
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, nonce, { authTagLength: TAG_BYTES });
      decipher.setAAD(aad(`${PREFIX}:${VERSION}:${id}`, context));
      decipher.setAuthTag(body.subarray(body.length - TAG_BYTES));
      return Buffer.concat([decipher.update(body.subarray(0, body.length - TAG_BYTES)), decipher.final()]).toString(
        'utf8',
      );
    } catch {
      throw new Error('Encrypted value failed authentication (wrong key, wrong column, or altered).');
    }
  }

  /**
   * Keyed one-way hash (HMAC-SHA256) for short secrets that are only ever compared, never read back (e.g.
   * 2FA recovery codes): unlike a plain SHA-256, a stolen database alone does not allow guessing them
   * offline. Stored form: `mac:v1:<key id>:<hex>`, made with the current key; `context` separates uses.
   */
  mac(value: string, context: string): string {
    const id = this.keys[0].id;
    return `${MAC_PREFIX}:${VERSION}:${id}:${this.macHex(id, value, context)}`;
  }

  /**
   * Whether `value` hashes to `stored` (constant time). Hashes made with an older key still match while
   * that key is in SECRETS_KEY; with the key gone (or a malformed value) nothing matches.
   */
  macMatches(stored: string, value: string, context: string): boolean {
    const parts = stored.split(':');
    if (parts.length !== 4 || parts[0] !== MAC_PREFIX || parts[1] !== VERSION) return false;
    const expected = this.macHex(parts[2], value, context);
    if (expected === null) return false;
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(parts[3], 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private macHex(id: string, value: string, context: string): string | null {
    const key = this.macKeys.get(id);
    if (!key) return null;
    return createHmac('sha256', key).update(`${context}|${value}`, 'utf8').digest('hex');
  }

  /** True when the value should be (re-)encrypted: plain text, or made with an older key. */
  needsReencrypt(stored: string | null | undefined): boolean {
    if (stored === null || stored === undefined || stored === '') return false;
    return !isEncrypted(stored) || stored.split(':')[2] !== this.currentKeyId;
  }
}

function aad(header: string, context: string): Buffer {
  return Buffer.from(`${header}|${context}`, 'utf8');
}

/** Non-production stand-in when SECRETS_KEY is not set: derived from JWT_SECRET, so it stays stable across restarts. */
function developmentKey(): SecretKey {
  const seed = process.env.JWT_SECRET || 'noagenda-development';
  const key = Buffer.from(hkdfSync('sha256', seed, 'noagenda', 'secrets-at-rest dev key', KEY_BYTES));
  return { id: keyId(key), key };
}

let shared: SecretBox | undefined;

/**
 * The app-wide SecretBox, built from SECRETS_KEY on first use. Outside production a missing key falls
 * back to one derived from JWT_SECRET (with a warning); production refuses to start without it (main.ts).
 */
export function secretBox(): SecretBox {
  if (shared) return shared;
  const value = process.env.SECRETS_KEY;
  if (value) {
    shared = new SecretBox(parseSecretKeys(value));
  } else {
    if (process.env.NODE_ENV === 'production') throw new Error('SECRETS_KEY environment variable is required.');
    new Logger('SecretBox').warn('SECRETS_KEY is not set: using a development key derived from JWT_SECRET.');
    shared = new SecretBox([developmentKey()]);
  }
  return shared;
}

/** Tests only: forget the cached SecretBox so a changed SECRETS_KEY is read again. */
export function resetSecretBoxForTests(): void {
  shared = undefined;
}

/**
 * TypeORM transformer for a string column that holds a secret: `@Column({ transformer: encryptedColumn('webhook.secret') })`.
 * Entities see plain text; the database only ever gets the encrypted form. `context` names the column
 * (`<table>.<column>`) and must stay the same for the column's lifetime.
 */
export function encryptedColumn(context: string): ValueTransformer {
  return {
    to: (value: string | null | undefined) =>
      value === null || value === undefined || value === '' ? value : secretBox().encrypt(value, context),
    from: (value: string | null) => (value === null || value === '' ? value : decryptOrExplain(value, context)),
  };
}

/**
 * The same for selected top-level fields of a JSON column (e.g. the "secret" fields a plugin declares),
 * leaving the other fields readable: `@Column({ type: 'json', transformer: encryptedJsonFields('plugin.config', ['botToken']) })`.
 */
export function encryptedJsonFields(context: string, fields: readonly string[]): ValueTransformer {
  const map = (obj: unknown, fn: (v: string, field: string) => string) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const out: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
    for (const f of fields) {
      const v = out[f];
      if (typeof v === 'string' && v !== '') out[f] = fn(v, f);
    }
    return out;
  };
  return {
    to: (value: unknown) => map(value, (v, f) => secretBox().encrypt(v, `${context}.${f}`)),
    from: (value: unknown) => map(value, (v, f) => decryptOrExplain(v, `${context}.${f}`)),
  };
}

function decryptOrExplain(value: string, context: string): string {
  try {
    return secretBox().decrypt(value, context);
  } catch (err) {
    throw new Error(`Cannot read ${context}: ${(err as Error).message}`, { cause: err });
  }
}
