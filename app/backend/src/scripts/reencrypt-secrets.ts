/**
 * Key rotation for secrets at rest: re-encrypt every encrypted column with the newest SECRETS_KEY.
 *
 *   1. Put the new key FIRST in SECRETS_KEY and keep the old one after it:  SECRETS_KEY=<new>,<old>
 *   2. Restart the backend (new values are now written with the new key).
 *   3. npm run secrets:reencrypt        (in Docker: docker compose exec backend node dist/scripts/reencrypt-secrets.js)
 *   4. Remove the old key from SECRETS_KEY and restart again.
 *
 * Also encrypts any value still in plain text. Safe to run any number of times.
 */
import dataSource from '../data-source';
import { ENCRYPTED_COLUMNS, reencryptColumn } from '../common/encrypted-columns';
import { secretBox } from '../common/secret-box';

async function main() {
  const box = secretBox();
  await dataSource.initialize();
  try {
    console.log(`Current key: ${box.currentKeyId}`);
    for (const col of ENCRYPTED_COLUMNS) {
      const { updated, current } = await reencryptColumn(dataSource, col, box);
      console.log(`${col.table}.${col.column}: ${updated} re-encrypted, ${current} already current`);
    }
    console.log('Done. Keys other than the first in SECRETS_KEY can now be removed.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
