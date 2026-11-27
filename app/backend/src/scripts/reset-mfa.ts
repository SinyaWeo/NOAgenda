/**
 * Switch off a user's two-factor authentication from the command line: for an admin who lost both their
 * phone and their recovery codes and has no other admin to do it in the UI (/admin/users).
 *
 *   node dist/scripts/reset-mfa.js <username>
 *   docker compose exec backend node dist/scripts/reset-mfa.js alice
 *
 * If 2FA is required for the account (admin setting or a team), it must be set up again at the next sign-in.
 */
import dataSource from '../data-source';

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error('Usage: reset-mfa <username>');
    process.exit(2);
  }
  await dataSource.initialize();
  try {
    const res: { affectedRows?: number } = await dataSource.query(
      'UPDATE users SET totpSecret = NULL, totpEnabledAt = NULL, totpLastStep = NULL, totpRecoveryCodes = NULL WHERE username = ?',
      [username],
    );
    if (!res.affectedRows) {
      console.error(`No user named "${username}".`);
      process.exitCode = 1;
    } else {
      console.log(`Two-factor authentication is off for "${username}".`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
