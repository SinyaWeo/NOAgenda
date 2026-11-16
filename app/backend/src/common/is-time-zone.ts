import { registerDecorator, ValidationOptions } from 'class-validator';

/** True for an IANA time-zone name the runtime knows ("Europe/Prague", "UTC", "America/New_York"). */
export function isValidTimeZone(value: unknown): boolean {
  if (typeof value !== 'string' || !value) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function IsTimeZone(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isTimeZone',
      target: target.constructor,
      propertyName,
      options: { message: '$property must be a valid time zone such as Europe/Prague', ...options },
      validator: { validate: isValidTimeZone },
    });
}
