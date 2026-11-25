import {
  addDaysZoned,
  addMonthsZoned,
  dayDiff,
  daysBeforeAt,
  fromZoned,
  isoWeekday,
  safeTimeZone,
  toZoned,
} from '../zoned-time';

describe('zoned time', () => {
  it('reads and writes wall-clock time in a zone', () => {
    const z = toZoned(new Date('2026-07-01T07:30:00Z'), 'Europe/Prague');
    expect(z).toMatchObject({ year: 2026, month: 7, day: 1, hour: 9, minute: 30 });
    expect(fromZoned(z, 'Europe/Prague')).toEqual(new Date('2026-07-01T07:30:00Z'));
  });

  it('midnight is hour 0, not 24', () => {
    expect(toZoned(new Date('2026-07-01T22:00:00Z'), 'Europe/Prague').hour).toBe(0);
  });

  it('picks the first occurrence of a repeated hour and moves past a skipped one', () => {
    const wall = (day: number, hour: number, minute = 30) => ({
      year: 2026,
      month: day < 28 ? 10 : 3,
      day,
      hour,
      minute,
      second: 0,
      ms: 0,
    });
    // clocks go back 2026-10-25 03:00 CEST -> 02:00 CET: 02:30 happens twice
    expect(fromZoned(wall(25, 2), 'Europe/Prague')).toEqual(new Date('2026-10-25T00:30:00Z'));
    // clocks go forward 2026-03-29 02:00 CET -> 03:00 CEST: 02:30 does not exist
    expect(fromZoned(wall(29, 2), 'Europe/Prague')).toEqual(new Date('2026-03-29T01:30:00Z'));
  });

  it('does not overflow for dates beyond the range of a Date', () => {
    const far = { year: 275760, month: 12, day: 31, hour: 0, minute: 0, second: 0, ms: 0 };
    expect(Number.isNaN(fromZoned(far, 'UTC').getTime())).toBe(true);
  });

  it('calendar arithmetic', () => {
    const z = toZoned(new Date('2026-01-31T09:00:00Z'), 'UTC');
    expect(addMonthsZoned(z, 1)).toMatchObject({ month: 2, day: 28 });
    expect(addMonthsZoned(z, 12)).toMatchObject({ year: 2027, month: 1, day: 31 });
    expect(addMonthsZoned(z, -2)).toMatchObject({ year: 2025, month: 11, day: 30 });
    expect(addDaysZoned(z, 1)).toMatchObject({ month: 2, day: 1 });
    expect(dayDiff(z, addDaysZoned(z, 45))).toBe(45);
    expect(isoWeekday(2026, 3, 9)).toBe(1); // Monday
    expect(isoWeekday(2026, 3, 15)).toBe(7); // Sunday
  });

  it('falls back to UTC for unknown zones', () => {
    expect(safeTimeZone('Europe/Prague')).toBe('Europe/Prague');
    expect(safeTimeZone('Mars/Olympus')).toBe('UTC');
    expect(safeTimeZone(null)).toBe('UTC');
  });
});

describe('daysBeforeAt', () => {
  it('counts calendar days before the due day in the given zone, at the given local time', () => {
    // Due 2026-03-10 at noon in Prague (11:00 UTC); 2 days before at 09:30 Prague = 08:30 UTC.
    const due = new Date('2026-03-10T11:00:00Z');
    expect(daysBeforeAt(due, 2, '09:30', 'Europe/Prague').toISOString()).toBe('2026-03-08T08:30:00.000Z');
  });

  it('uses the due day as it falls in that zone, across a DST change', () => {
    // 2026-03-30 00:30 in Prague is still 03-29 in UTC; 0 days before at 08:00 Prague (CEST, UTC+2).
    const due = new Date('2026-03-29T22:30:00Z');
    expect(daysBeforeAt(due, 0, '08:00', 'Europe/Prague').toISOString()).toBe('2026-03-30T06:00:00.000Z');
    // One day before lands on the DST day itself, still at 08:00 local.
    expect(daysBeforeAt(due, 1, '08:00', 'Europe/Prague').toISOString()).toBe('2026-03-29T06:00:00.000Z');
  });
});
