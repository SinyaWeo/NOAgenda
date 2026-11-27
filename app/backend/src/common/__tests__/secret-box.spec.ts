import { randomBytes } from 'crypto';
import {
  SecretBox,
  encryptedColumn,
  encryptedJsonFields,
  isEncrypted,
  keyId,
  parseSecretKeys,
  resetSecretBoxForTests,
  secretBox,
} from '../secret-box';

const newKey = () => {
  const key = randomBytes(32);
  return { id: keyId(key), key, text: key.toString('base64') };
};

describe('SecretBox', () => {
  const k1 = newKey();
  const k2 = newKey();
  const box = new SecretBox([k1]);

  it('round-trips text, including non-ASCII and the empty string', () => {
    for (const v of ['s3cr3t', 'žluťoučký kůň 🐴', '', 'x'.repeat(1000)]) {
      expect(box.decrypt(box.encrypt(v, 'ctx'), 'ctx')).toBe(v);
    }
  });

  it('stores a versioned, self-describing value that differs every time for the same input', () => {
    const a = box.encrypt('same', 'ctx');
    const b = box.encrypt('same', 'ctx');
    expect(a).not.toBe(b);
    expect(a).toMatch(new RegExp(`^enc:v1:${k1.id}:[A-Za-z0-9_-]{16}:[A-Za-z0-9_-]+$`));
    expect(a).not.toContain('same');
    expect(isEncrypted(a)).toBe(true);
  });

  it('rejects a tampered value', () => {
    const v = box.encrypt('secret', 'ctx');
    const parts = v.split(':');
    const body = Buffer.from(parts[4], 'base64url');
    body[0] ^= 1;
    parts[4] = body.toString('base64url');
    expect(() => box.decrypt(parts.join(':'), 'ctx')).toThrow(/authentication/);
    // A forged key id in the authenticated header is caught too.
    expect(() => box.decrypt(v.replace(`:${k1.id}:`, `:${k2.id}:`), 'ctx')).toThrow();
  });

  it('rejects a value moved to another column (context)', () => {
    expect(() => box.decrypt(box.encrypt('secret', 'webhook.secret'), 'plugin.config.token')).toThrow(/authentication/);
  });

  it('rejects a value made with a key that is not configured, and says which key it needs', () => {
    const other = new SecretBox([k2]);
    expect(() => box.decrypt(other.encrypt('secret'))).toThrow(new RegExp(`key ${k2.id}.*not in SECRETS_KEY`));
  });

  it('rejects malformed or unknown-version values', () => {
    expect(() => box.decrypt('enc:v9:abc:def:ghi')).toThrow(/Unsupported/);
    expect(() => box.decrypt(`enc:v1:${k1.id}:short:x`)).toThrow(/malformed/);
  });

  it('reads legacy plain text unchanged until it is migrated', () => {
    expect(box.decrypt('legacy-plain-secret')).toBe('legacy-plain-secret');
    expect(box.needsReencrypt('legacy-plain-secret')).toBe(true);
  });

  it('rotates: the newest key encrypts, older keys still decrypt, and old values are flagged', () => {
    const before = box.encrypt('rotate me', 'ctx');
    const rotated = new SecretBox([k2, k1]);
    expect(rotated.currentKeyId).toBe(k2.id);
    expect(rotated.decrypt(before, 'ctx')).toBe('rotate me');
    expect(rotated.needsReencrypt(before)).toBe(true);
    const after = rotated.encrypt('rotate me', 'ctx');
    expect(after.split(':')[2]).toBe(k2.id);
    expect(rotated.needsReencrypt(after)).toBe(false);
    // Once the old key is dropped, values that were not re-encrypted can no longer be read.
    expect(() => new SecretBox([k2]).decrypt(before, 'ctx')).toThrow(/not in SECRETS_KEY/);
  });

  it('has nothing to do for empty values', () => {
    expect(box.needsReencrypt(null)).toBe(false);
    expect(box.needsReencrypt('')).toBe(false);
  });
});

describe('parseSecretKeys', () => {
  it('accepts one or more base64 (or base64url) 32-byte keys, newest first', () => {
    const a = newKey();
    const b = newKey();
    const keys = parseSecretKeys(`${a.text}, ${b.key.toString('base64url')}`);
    expect(keys.map((k) => k.id)).toEqual([a.id, b.id]);
  });

  it('rejects wrong lengths, junk, placeholders, duplicates and an empty list', () => {
    expect(() => parseSecretKeys(randomBytes(16).toString('base64'))).toThrow(/32-byte/);
    expect(() => parseSecretKeys('change_me')).toThrow(/32-byte/);
    expect(() => parseSecretKeys(`${'A'.repeat(43)}=!`)).toThrow(/32-byte/);
    const a = newKey();
    expect(() => parseSecretKeys(`${a.text},${a.text}`)).toThrow(/twice/);
    expect(() => parseSecretKeys(' , ')).toThrow(/empty/);
  });
});

describe('the app-wide SecretBox and the TypeORM transformers', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    resetSecretBoxForTests();
  });

  it('uses SECRETS_KEY when it is set', () => {
    const k = newKey();
    process.env.SECRETS_KEY = k.text;
    resetSecretBoxForTests();
    expect(secretBox().currentKeyId).toBe(k.id);
  });

  it('outside production falls back to a stable key derived from JWT_SECRET', () => {
    delete process.env.SECRETS_KEY;
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'dev-secret';
    resetSecretBoxForTests();
    const v = secretBox().encrypt('x');
    resetSecretBoxForTests();
    expect(secretBox().decrypt(v)).toBe('x');
  });

  it('refuses to work in production without SECRETS_KEY', () => {
    delete process.env.SECRETS_KEY;
    process.env.NODE_ENV = 'production';
    resetSecretBoxForTests();
    expect(() => secretBox()).toThrow(/SECRETS_KEY/);
  });

  it('encryptedColumn: the database gets ciphertext, the entity plain text; null and empty pass through', () => {
    process.env.SECRETS_KEY = newKey().text;
    resetSecretBoxForTests();
    const t = encryptedColumn('webhook.secret');
    const stored = t.to('hook-secret') as string;
    expect(isEncrypted(stored)).toBe(true);
    expect(t.from(stored)).toBe('hook-secret');
    expect(t.from('legacy')).toBe('legacy');
    for (const v of [null, undefined, '']) expect(t.to(v)).toBe(v);
    expect(t.from(null)).toBeNull();
  });

  it('encryptedColumn names the column when a value cannot be read', () => {
    process.env.SECRETS_KEY = newKey().text;
    resetSecretBoxForTests();
    const stored = new SecretBox([newKey()]).encrypt('x', 'webhook.secret');
    expect(() => encryptedColumn('webhook.secret').from(stored)).toThrow(/Cannot read webhook\.secret/);
  });

  it('encryptedJsonFields encrypts only the listed fields and leaves the rest readable', () => {
    process.env.SECRETS_KEY = newKey().text;
    resetSecretBoxForTests();
    const t = encryptedJsonFields('plugin.config', ['botToken']);
    const stored = t.to({ botToken: '123:ABC', botName: 'noagenda_bot', empty: '' }) as Record<string, unknown>;
    expect(isEncrypted(stored.botToken as string)).toBe(true);
    expect(stored.botName).toBe('noagenda_bot');
    expect(t.from(stored)).toEqual({ botToken: '123:ABC', botName: 'noagenda_bot', empty: '' });
    for (const v of [null, undefined, [1, 2]]) expect(t.to(v)).toEqual(v);
    // A field is bound to its own name: swapping two encrypted fields is detected.
    const two = encryptedJsonFields('plugin.config', ['a', 'b']);
    const s = two.to({ a: 'A', b: 'B' }) as Record<string, string>;
    expect(() => two.from({ a: s.b, b: s.a })).toThrow(/Cannot read plugin\.config\.a/);
  });
});
