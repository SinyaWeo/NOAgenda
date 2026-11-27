import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';
import { ENCRYPTED_COLUMNS } from '../encrypted-columns';

/**
 * A column whose name says it holds a credential must either be one of the known hashes (never readable)
 * or be encrypted at rest with `encryptedColumn` / `encryptedJsonFields` (common/secret-box.ts).
 * So a new `apiKey` or `botToken` column cannot slip into the database (and every backup) as plain text.
 */
const HASHED: Record<string, string> = {
  'modules/user/user.entity.ts password': 'bcrypt hash',
  'modules/session/session.entity.ts tokenHash': 'SHA-256 of the refresh token',
  'modules/session/session.entity.ts prevTokenHash': 'SHA-256 of the previous refresh token',
  'modules/auth/password-reset-token.entity.ts token': 'SHA-256 of the reset token',
  'modules/auth/email-verification-token.entity.ts tokenHash': 'SHA-256 of the verification token',
  'modules/api-token/api-token.entity.ts token': 'SHA-256 of the API token',
  'modules/api-token/api-token.entity.ts tokenPrefix': 'first characters, shown to tell tokens apart',
};
const SENSITIVE = /secret|token|password|passwd|apikey|api_key|credential|privatekey/i;
const SRC = join(__dirname, '..', '..');
/** A @Column(...) decorator (other decorators may sit between) and the property it decorates. */
const COLUMN = /@Column\(([\s\S]*?)\)\s*\n(?:\s*@\w+\([^\n]*\)\s*\n)*\s*(\w+)[?!]?:/g;

function entityFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'migrations' ? [] : entityFiles(path);
    return name.endsWith('.entity.ts') ? [path] : [];
  });
}

function sensitiveColumns() {
  return entityFiles(SRC).flatMap((file) => {
    const rel = relative(SRC, file).split(sep).join('/');
    return [...readFileSync(file, 'utf8').matchAll(COLUMN)]
      .filter((m) => SENSITIVE.test(m[2]))
      .map((m) => ({ where: `${rel} ${m[2]}`, options: m[1] }));
  });
}

describe('credential columns', () => {
  it('are either hashed or encrypted at rest', () => {
    const plain = sensitiveColumns()
      .filter((c) => !HASHED[c.where])
      .filter((c) => !/transformer:\s*encrypted(Column|JsonFields)\(/.test(c.options))
      .map((c) => c.where);
    expect(plain).toEqual([]);
  });

  it('the scan finds the known columns, so it is not silently matching nothing', () => {
    const found = sensitiveColumns().map((c) => c.where);
    for (const known of Object.keys(HASHED)) expect(found).toContain(known);
    expect(found).toContain('modules/webhook/webhook.entity.ts secret');
  });

  it('every encrypted column is listed for the migration and key rotation', () => {
    const encrypted = entityFiles(SRC).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/encryptedColumn\('([\w.]+)'\)/g)].map((m) => m[1]),
    );
    expect(encrypted.sort()).toEqual(ENCRYPTED_COLUMNS.map((c) => c.context).sort());
  });
});
