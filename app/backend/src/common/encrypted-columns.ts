import { isEncrypted, SecretBox } from './secret-box';

/**
 * Every column stored through `encryptedColumn(...)`, for the migration that encrypts existing values and
 * for key rotation (`npm run secrets:reencrypt`). Add a column here when you give it the transformer;
 * `context` must match the one passed to `encryptedColumn`.
 */
export const ENCRYPTED_COLUMNS: readonly EncryptedColumn[] = [
  { table: 'webhook', column: 'secret', context: 'webhook.secret' },
];

/**
 * JSON columns holding encrypted values inside them: the secret fields of plugin settings. Each value's
 * context is `<prefix>.<plugin key>.<field>`, the plugin key being read from `keyColumn` of the same row
 * (see PluginService).
 */
export const ENCRYPTED_JSON_COLUMNS: readonly EncryptedJsonColumn[] = [
  { table: 'plugin', column: 'config', keyColumn: 'key', prefix: 'plugin' },
  { table: 'user_plugin_settings', column: 'settings', keyColumn: 'pluginKey', prefix: 'user_plugin_settings' },
];

export interface EncryptedJsonColumn {
  table: string;
  column: string;
  keyColumn: string;
  prefix: string;
}

export interface EncryptedColumn {
  table: string;
  column: string;
  context: string;
}

/** What `QueryRunner` and `DataSource` have in common. */
export interface SqlRunner {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface ReencryptResult {
  /** Values that were rewritten (plain text encrypted, or moved to the current key). */
  updated: number;
  /** Values that were already encrypted with the current key. */
  current: number;
}

/**
 * Bring one column up to date: encrypt legacy plain text and re-encrypt values made with an older key.
 * Safe to run any number of times. Each row is only rewritten if it still holds the value that was read,
 * so a change made meanwhile through the app is never overwritten.
 */
export async function reencryptColumn(db: SqlRunner, col: EncryptedColumn, box: SecretBox): Promise<ReencryptResult> {
  const t = `\`${col.table}\``;
  const c = `\`${col.column}\``;
  const rows = (await db.query(`SELECT id, ${c} AS value FROM ${t} WHERE ${c} IS NOT NULL AND ${c} <> ''`)) as {
    id: number;
    value: string;
  }[];
  const result: ReencryptResult = { updated: 0, current: 0 };
  for (const row of rows) {
    if (!box.needsReencrypt(row.value)) {
      result.current++;
      continue;
    }
    const plain = box.decrypt(row.value, col.context);
    await db.query(`UPDATE ${t} SET ${c} = ? WHERE id = ? AND ${c} = ?`, [
      box.encrypt(plain, col.context),
      row.id,
      row.value,
    ]);
    result.updated++;
  }
  return result;
}

/** Turn a column back into plain text (only for an explicit, deliberate rollback). */
export async function decryptColumn(db: SqlRunner, col: EncryptedColumn, box: SecretBox): Promise<number> {
  const t = `\`${col.table}\``;
  const c = `\`${col.column}\``;
  const rows = (await db.query(`SELECT id, ${c} AS value FROM ${t} WHERE ${c} LIKE 'enc:%'`)) as {
    id: number;
    value: string;
  }[];
  for (const row of rows) {
    await db.query(`UPDATE ${t} SET ${c} = ? WHERE id = ? AND ${c} = ?`, [
      box.decrypt(row.value, col.context),
      row.id,
      row.value,
    ]);
  }
  return rows.length;
}

/**
 * Key rotation for encrypted values inside JSON columns: every encrypted value made with an older key is
 * re-encrypted with the current one. (Plain values are left alone: which fields are secret is known only to
 * the plugin, and the service always stores those encrypted.) Safe to run any number of times.
 */
export async function reencryptJsonColumn(
  db: SqlRunner,
  col: EncryptedJsonColumn,
  box: SecretBox,
): Promise<ReencryptResult> {
  const t = `\`${col.table}\``;
  const c = `\`${col.column}\``;
  const k = `\`${col.keyColumn}\``;
  const rows = (await db.query(`SELECT id, ${k} AS k, ${c} AS value FROM ${t} WHERE ${c} IS NOT NULL`)) as {
    id: number;
    k: string;
    value: string | Record<string, unknown>;
  }[];
  const result: ReencryptResult = { updated: 0, current: 0 };
  for (const row of rows) {
    const obj = (typeof row.value === 'string' ? JSON.parse(row.value) : row.value) as Record<string, unknown> | null;
    if (!obj || typeof obj !== 'object') continue;
    let changed = false;
    for (const [field, v] of Object.entries(obj)) {
      if (typeof v !== 'string' || !isEncrypted(v)) continue;
      if (!box.needsReencrypt(v)) {
        result.current++;
        continue;
      }
      const context = `${col.prefix}.${row.k}.${field}`;
      obj[field] = box.encrypt(box.decrypt(v, context), context);
      changed = true;
      result.updated++;
    }
    if (changed) await db.query(`UPDATE ${t} SET ${c} = ? WHERE id = ?`, [JSON.stringify(obj), row.id]);
  }
  return result;
}
