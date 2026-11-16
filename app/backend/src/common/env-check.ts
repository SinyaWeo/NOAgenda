/** Values that ship in the example env files: a secret like these is public knowledge. */
const PLACEHOLDER = /change_?me|your[_-]?jwt|your[_-]?secret|replace[_-]?me|example|secret_here/i;

/** Throws when the JWT secret is missing, or in production too short or still a placeholder. */
export function validateJwtSecret(secret: string | undefined, isProd: boolean): void {
  if (!secret) throw new Error('JWT_SECRET environment variable is required but not set.');
  if (!isProd) return;
  if (secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters in production.');
  if (PLACEHOLDER.test(secret)) {
    throw new Error(
      'JWT_SECRET is still a placeholder from an example file. Generate a real one: openssl rand -base64 48',
    );
  }
}
