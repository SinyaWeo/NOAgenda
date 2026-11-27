import { SecretBox } from './secret-box';

/**
 * Every column stored through `encryptedColumn(...)`, for the migration that encrypts existing values and
 * for key rotation (`npm run secrets:reencrypt`). Add a column here when you give it the transformer;
 * `context` must match the one passed to `encryptedColumn`.
 */
export const ENCRYPTED_COLUMNS: readonly EncryptedColumn[] = [
  { table: 'webhook', column: 'secret', context: 'webhook.secret' },
];

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
