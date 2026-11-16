import { validateJwtSecret } from '../env-check';

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
