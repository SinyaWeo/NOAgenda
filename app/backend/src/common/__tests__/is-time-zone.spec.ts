import { isValidTimeZone } from '../is-time-zone';

describe('isValidTimeZone', () => {
  it.each(['UTC', 'Europe/Prague', 'America/New_York', 'Asia/Tokyo'])('accepts %s', (z) =>
    expect(isValidTimeZone(z)).toBe(true),
  );
  it.each(['', 'Mars/Olympus', 'prague', '<script>', 'Europe/Prague; drop table', 42, null, undefined])(
    'rejects %p',
    (z) => expect(isValidTimeZone(z)).toBe(false),
  );
});
