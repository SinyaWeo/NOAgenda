/**
 * Who must use two-factor authentication: an app admin while the admin setting `requireAdminMfa` is
 * 'true', and every member of a team with `requireMfa` on. (Ignored on the demo, see MfaEnrollmentGuard.)
 */
export const REQUIRE_ADMIN_MFA_KEY = 'requireAdminMfa';

/** SQL that is 1 when user `u` falls under the 2FA requirement (whether or not they have it on). */
export function mfaRequiredSql(u: string): string {
  return `((${u}.role = 'admin' AND EXISTS (SELECT 1 FROM app_settings s WHERE s.\`key\` = '${REQUIRE_ADMIN_MFA_KEY}' AND s.value = 'true'))
    OR EXISTS (SELECT 1 FROM team_members tm JOIN teams t ON t.id = tm.teamId WHERE tm.userId = ${u}.id AND t.requireMfa = 1))`;
}

/** SQL that is 1 when user `u` must use 2FA but has not switched it on: they may only set it up. */
export function mfaMissingSql(u: string): string {
  return `(${u}.totpEnabledAt IS NULL AND ${mfaRequiredSql(u)})`;
}
