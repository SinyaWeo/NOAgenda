import { randomBytes } from 'crypto';
import { ENCRYPTED_COLUMNS, decryptColumn, reencryptColumn, type SqlRunner } from '../encrypted-columns';
import { SecretBox, isEncrypted, keyId } from '../secret-box';

const key = () => {
  const k = randomBytes(32);
  return { id: keyId(k), key: k };
};
const COL = { table: 'webhook', column: 'secret', context: 'webhook.secret' };

/** A one-table fake database that understands the two statements reencryptColumn uses. */
function fakeDb(values: Record<number, string>) {
  const rows = new Map(Object.entries(values).map(([id, v]) => [Number(id), v]));
  const db: SqlRunner & { rows: Map<number, string>; updates: number } = {
    rows,
    updates: 0,
    async query(sql: string, params: unknown[] = []) {
      if (sql.startsWith('SELECT')) {
        const onlyEncrypted = sql.includes("LIKE 'enc:%'");
        return [...rows]
          .filter(([, v]) => v !== '' && (!onlyEncrypted || v.startsWith('enc:')))
          .map(([id, value]) => ({ id, value }));
      }
      const [value, id, expected] = params as [string, number, string];
      if (rows.get(id) === expected) {
        rows.set(id, value);
        db.updates++;
      }
      return { affectedRows: 1 };
    },
  };
  return db;
}

describe('reencryptColumn', () => {
  const oldKey = key();
  const newKey = key();

  it('encrypts plain text, moves old-key values to the current key and leaves current ones alone', async () => {
    const oldBox = new SecretBox([oldKey]);
    const box = new SecretBox([newKey, oldKey]);
    const current = box.encrypt('already', COL.context);
    const db = fakeDb({ 1: 'plain-secret', 2: oldBox.encrypt('old', COL.context), 3: current, 4: '' });
    expect(await reencryptColumn(db, COL, box)).toEqual({ updated: 2, current: 1 });
    expect(db.rows.get(3)).toBe(current);
    expect(db.rows.get(4)).toBe('');
    for (const [id, plain] of [
      [1, 'plain-secret'],
      [2, 'old'],
      [3, 'already'],
    ] as const) {
      const v = db.rows.get(id)!;
      expect(v.split(':')[2]).toBe(newKey.id);
      expect(box.decrypt(v, COL.context)).toBe(plain);
    }
    // Only the newest key is needed afterwards.
    expect(new SecretBox([newKey]).decrypt(db.rows.get(2)!, COL.context)).toBe('old');
  });

  it('is safe to run twice', async () => {
    const box = new SecretBox([newKey]);
    const db = fakeDb({ 1: 'a', 2: 'b' });
    await reencryptColumn(db, COL, box);
    const after = new Map(db.rows);
    expect(await reencryptColumn(db, COL, box)).toEqual({ updated: 0, current: 2 });
    expect(db.rows).toEqual(after);
  });

  it('does not overwrite a value that changed after it was read', async () => {
    const box = new SecretBox([newKey]);
    const db = fakeDb({ 1: 'a' });
    const query = db.query.bind(db);
    db.query = async (sql, params) => {
      const res = await query(sql, params);
      if (sql.startsWith('SELECT')) db.rows.set(1, 'changed meanwhile');
      return res;
    };
    await reencryptColumn(db, COL, box);
    expect(db.rows.get(1)).toBe('changed meanwhile');
  });

  it('fails loudly instead of guessing when a value needs a key that is gone', async () => {
    const db = fakeDb({ 1: new SecretBox([oldKey]).encrypt('x', COL.context) });
    await expect(reencryptColumn(db, COL, new SecretBox([newKey]))).rejects.toThrow(/not in SECRETS_KEY/);
  });
});

describe('decryptColumn (explicit rollback only)', () => {
  it('turns encrypted values back into plain text', async () => {
    const box = new SecretBox([key()]);
    const db = fakeDb({ 1: box.encrypt('s1', COL.context), 2: 'legacy' });
    expect(await decryptColumn(db, COL, box)).toBe(1);
    expect([...db.rows.values()]).toEqual(['s1', 'legacy']);
    expect([...db.rows.values()].some(isEncrypted)).toBe(false);
  });
});

describe('ENCRYPTED_COLUMNS', () => {
  it('lists the webhook signing secret', () => {
    expect(ENCRYPTED_COLUMNS).toContainEqual(COL);
  });
});
