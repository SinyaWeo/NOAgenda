/**
 * Make an existing user an administrator (the first-admin bootstrap).
 *
 *   node dist/scripts/promote-admin.js <username>          # or --demote <username>
 *   docker compose exec backend node dist/scripts/promote-admin.js alice
 */
import dataSource from '../data-source';

async function main() {
  const args = process.argv.slice(2);
  const demote = args[0] === '--demote';
  const username = demote ? args[1] : args[0];
  if (!username) {
    console.error('Usage: promote-admin <username>   |   promote-admin --demote <username>');
    process.exit(2);
  }
  await dataSource.initialize();
  try {
    const role = demote ? 'user' : 'admin';
    const res: any = await dataSource.query('UPDATE users SET role = ? WHERE username = ?', [role, username]);
    if (!res.affectedRows) {
      console.error(`No user named "${username}".`);
      process.exitCode = 1;
    } else {
      console.log(`"${username}" is now ${role === 'admin' ? 'an administrator' : 'a normal user'}.`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
