import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * bcrypt only uses the first 72 BYTES of a password and silently ignores the rest, so a
 * longer password would be weaker than the user thinks. Reject it instead of truncating.
 */
export function MaxBytes(max: number, options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'maxBytes',
      target: target.constructor,
      propertyName,
      options: { message: `$property must be at most ${max} bytes (long or non-ASCII passwords count per byte)`, ...options },
      validator: { validate: (v: unknown) => typeof v !== 'string' || Buffer.byteLength(v, 'utf8') <= max },
    });
}
