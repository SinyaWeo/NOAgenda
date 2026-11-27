import { randomBytes } from 'crypto';
import { validateJwtSecret, validateSecretsKey } from '../env-check';

describe('validateJwtSecret', () => {
  it('requires a secret everywhere', () => {
    expect(() => validateJwtSecret(undefined, false)).toThrow(/required/);
    expect(() => validateJwtSecret('', true)).toThrow(/required/);
  });
  it('accepts any non-empty secret outside production (local development)', () => {
    expect(() => validateJwtSecret('dev', false)).not.toThrow();
  });
  it('requires 32+ characters in production', () => {
    expect(() => validateJwtSecret('short', true)).toThrow(/32/);
  });
  it('rejects the placeholder from the example env file in production, even though it is long enough', () => {
    const shipped = 'change_me_to_a_long_random_secret';
    expect(shipped.length).toBeGreaterThanOrEqual(32);
    expect(() => validateJwtSecret(shipped, true)).toThrow(/placeholder/);
    expect(() => validateJwtSecret('your_jwt_secret_please_replace_this_value', true)).toThrow(/placeholder/);
  });
  it('accepts a real random secret in production', () => {
    expect(() => validateJwtSecret('q7Zk2mXv9LpR4tYw8NbC1dFhJ6sGaE3uVoQ5xTn0KiM=', true)).not.toThrow();
  });
});

describe('validateSecretsKey', () => {
  const key = randomBytes(32).toString('base64');
  it('is required in production', () => {
    expect(() => validateSecretsKey(undefined, true)).toThrow(/required in production/);
    expect(() => validateSecretsKey('', true)).toThrow(/required in production/);
  });
  it('may be missing outside production (a development key is derived)', () => {
    expect(() => validateSecretsKey(undefined, false)).not.toThrow();
  });
  it('rejects a malformed key everywhere', () => {
    expect(() => validateSecretsKey('change_me', false)).toThrow(/32-byte/);
    expect(() => validateSecretsKey(randomBytes(24).toString('base64'), true)).toThrow(/32-byte/);
  });
  it('accepts one key, or a list for rotation', () => {
    expect(() => validateSecretsKey(key, true)).not.toThrow();
    expect(() => validateSecretsKey(`${randomBytes(32).toString('base64')},${key}`, true)).not.toThrow();
  });
});
