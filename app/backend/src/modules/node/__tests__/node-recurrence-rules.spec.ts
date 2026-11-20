import { nextOccurrence, parseWeekdays, recurrenceOnCompletion } from '../node-recurrence';
import { Node, NodeStatus, NodeType, RepeatMode } from '../node.entity';

const d = (s: string) => new Date(s);
const PRAGUE = 'Europe/Prague';
const task = (over: Record<string, unknown> = {}) =>
  ({
    type: NodeType.TASK,
    status: NodeStatus.OPEN,
    dueDate: d('2026-03-10T09:00:00Z'), // a Tuesday
    startDate: null,
    repeatMode: RepeatMode.DEFAULT,
    repeatAfter: 1,
    repeatWeekdays: null,
    repeatUntil: null,
    repeatCount: null,
    ...over,
  }) as unknown as Node;
const next = (t: Node, now: string, tz = 'UTC') => nextOccurrence(t, d(now), tz)?.dueDate.toISOString();

describe('parseWeekdays', () => {
  it('reads ISO weekdays and ignores junk', () => {
    expect([...parseWeekdays('1,3,5')]).toEqual([1, 3, 5]);
    expect([...parseWeekdays('0,8,x,7')]).toEqual([7]);
    expect(parseWeekdays(null).size).toBe(0);
  });
});

describe('weekly', () => {
  const weekly = (over: Record<string, unknown> = {}) =>
    task({ repeatMode: RepeatMode.WEEKLY, repeatAfter: 1, repeatWeekdays: '1,3,5', ...over });

  it('goes to the next selected weekday', () => {
    // Tue 03-10 -> Wed 03-11
    expect(next(weekly(), '2026-03-10T10:00:00Z')).toBe('2026-03-11T09:00:00.000Z');
    // Fri 03-13 -> Mon 03-16
    expect(next(weekly({ dueDate: d('2026-03-13T09:00:00Z') }), '2026-03-13T10:00:00Z')).toBe(
      '2026-03-16T09:00:00.000Z',
    );
  });

  it('every second week skips the week in between', () => {
    // due Fri 03-13, every 2 weeks Mon/Wed/Fri: the rest of this week has no more days, so Mon 03-23
    expect(next(weekly({ repeatAfter: 2, dueDate: d('2026-03-13T09:00:00Z') }), '2026-03-13T10:00:00Z')).toBe(
      '2026-03-23T09:00:00.000Z',
    );
    // due Mon 03-09: Wed/Fri of the same week still count
    expect(next(weekly({ repeatAfter: 2, dueDate: d('2026-03-09T09:00:00Z') }), '2026-03-09T10:00:00Z')).toBe(
      '2026-03-11T09:00:00.000Z',
    );
  });

  it('defaults to the weekday of the due date', () => {
    expect(next(weekly({ repeatWeekdays: null, repeatAfter: 2 }), '2026-03-10T10:00:00Z')).toBe(
      '2026-03-24T09:00:00.000Z',
    );
  });

  it('skips dates in the past after a long delay, on the same rhythm', () => {
    // Tue 03-10 is the anchor; finishing on Fri 05-01 the next Mon/Wed/Fri after now is Mon 05-04
    expect(next(weekly(), '2026-05-01T12:00:00Z')).toBe('2026-05-04T09:00:00.000Z');
    // ... and a slot later today still counts
    expect(next(weekly(), '2026-05-01T07:00:00Z')).toBe('2026-05-01T09:00:00.000Z');
  });

  it('keeps the local time across the clocks going forward', () => {
    // Fri 2026-03-27 09:00 Prague (08:00Z, CET) -> Mon 2026-03-30 09:00 Prague (07:00Z, CEST)
    const t = weekly({ dueDate: d('2026-03-27T08:00:00Z') });
    expect(next(t, '2026-03-27T09:00:00Z', PRAGUE)).toBe('2026-03-30T07:00:00.000Z');
  });

  it('uses the weekday in the time zone, not in UTC', () => {
    // 16:00Z Tuesday is already 01:00 on Wednesday in Tokyo, so "the same weekday" is Wednesday there
    const t = weekly({ repeatWeekdays: null, dueDate: d('2026-03-10T16:00:00Z') }); // Wed 01:00 in Tokyo
    expect(next(t, '2026-03-10T17:00:00Z', 'Asia/Tokyo')).toBe('2026-03-17T16:00:00.000Z');
  });
});

describe('daily and monthly across clock changes', () => {
  it('every day stays at the same local hour', () => {
    const t = task({ dueDate: d('2026-03-28T08:00:00Z') }); // Sat 09:00 Prague (CET)
    expect(next(t, '2026-03-28T09:00:00Z', PRAGUE)).toBe('2026-03-29T07:00:00.000Z'); // Sun 09:00 CEST
  });

  it('every 7 days on a daylight-saving boundary', () => {
    const t = task({ repeatAfter: 7, dueDate: d('2026-10-24T07:00:00Z') }); // Sat 09:00 CEST
    expect(next(t, '2026-10-24T10:00:00Z', PRAGUE)).toBe('2026-10-31T08:00:00.000Z'); // 09:00 CET
  });

  it('a long delay still lands on the right local hour', () => {
    const t = task({ dueDate: d('2026-01-05T08:00:00Z') }); // 09:00 CET
    expect(next(t, '2026-07-01T12:00:00Z', PRAGUE)).toBe('2026-07-02T07:00:00.000Z'); // 09:00 CEST
  });

  it('monthly keeps the local hour', () => {
    const t = task({ repeatMode: RepeatMode.MONTHLY, dueDate: d('2026-03-15T08:00:00Z') });
    expect(next(t, '2026-03-15T09:00:00Z', PRAGUE)).toBe('2026-04-15T07:00:00.000Z');
  });

  it('a local time that does not exist moves past the gap', () => {
    // 02:30 on the day the clocks skip 02:00-03:00 (2026-03-29 in Prague)
    const t = task({ dueDate: d('2026-03-28T01:30:00Z') }); // Sat 02:30 CET
    expect(next(t, '2026-03-28T02:00:00Z', PRAGUE)).toBe('2026-03-29T01:30:00.000Z'); // 03:30 CEST
  });
});

describe('month end', () => {
  const t = (over: Record<string, unknown> = {}) =>
    task({ repeatMode: RepeatMode.MONTH_END, dueDate: d('2026-01-31T09:00:00Z'), ...over });
  it('is the last day of each following month', () => {
    expect(next(t(), '2026-01-31T10:00:00Z')).toBe('2026-02-28T09:00:00.000Z');
    expect(next(t({ dueDate: d('2026-02-28T09:00:00Z') }), '2026-02-28T10:00:00Z')).toBe('2026-03-31T09:00:00.000Z');
    expect(next(t({ dueDate: d('2028-01-31T09:00:00Z') }), '2028-01-31T10:00:00Z')).toBe('2028-02-29T09:00:00.000Z');
  });
  it('can step several months', () => {
    expect(next(t({ repeatAfter: 3 }), '2026-01-31T10:00:00Z')).toBe('2026-04-30T09:00:00.000Z');
  });
  it('moves a mid-month date to the end of the next month', () => {
    expect(next(t({ dueDate: d('2026-01-15T09:00:00Z') }), '2026-01-15T10:00:00Z')).toBe('2026-02-28T09:00:00.000Z');
  });
});

describe('monthly on the nth weekday', () => {
  const t = (due: string, over: Record<string, unknown> = {}) =>
    task({ repeatMode: RepeatMode.MONTHLY_WEEKDAY, dueDate: d(due), ...over });
  it('keeps "second Tuesday"', () => {
    // 2026-03-10 is the second Tuesday; April's is the 14th
    expect(next(t('2026-03-10T09:00:00Z'), '2026-03-10T10:00:00Z')).toBe('2026-04-14T09:00:00.000Z');
  });
  it('keeps "first Monday"', () => {
    expect(next(t('2026-03-02T09:00:00Z'), '2026-03-02T10:00:00Z')).toBe('2026-04-06T09:00:00.000Z');
  });
  it('the fifth weekday means the last one, even in a month that has only four', () => {
    // 2026-03-31 is the fifth (and last) Tuesday; April has Tuesdays up to the 28th
    expect(next(t('2026-03-31T09:00:00Z'), '2026-03-31T10:00:00Z')).toBe('2026-04-28T09:00:00.000Z');
    // May's last Tuesday is the 26th
    expect(next(t('2026-03-31T09:00:00Z', { repeatAfter: 2 }), '2026-03-31T10:00:00Z')).toBe(
      '2026-05-26T09:00:00.000Z',
    );
  });
  it('every N months', () => {
    expect(next(t('2026-03-10T09:00:00Z', { repeatAfter: 3 }), '2026-03-10T10:00:00Z')).toBe(
      '2026-06-09T09:00:00.000Z',
    );
  });
});

describe('end conditions', () => {
  it('stops when the next date falls after repeatUntil (inclusive of that day)', () => {
    const t = task({ repeatAfter: 7, repeatUntil: d('2026-03-24T12:00:00Z') });
    expect(next(t, '2026-03-10T10:00:00Z')).toBe('2026-03-17T09:00:00.000Z');
    expect(next(task({ repeatAfter: 7, repeatUntil: d('2026-03-17T12:00:00Z') }), '2026-03-10T10:00:00Z')).toBe(
      '2026-03-17T09:00:00.000Z',
    );
    expect(
      next(task({ repeatAfter: 7, repeatUntil: d('2026-03-16T12:00:00Z') }), '2026-03-10T10:00:00Z'),
    ).toBeUndefined();
  });

  it('completing the last counted occurrence ends the series', () => {
    const now = d('2026-03-10T10:00:00Z');
    expect(recurrenceOnCompletion(task({ repeatCount: 1 }), { status: NodeStatus.DONE }, now)).toBeNull();
    expect(recurrenceOnCompletion(task({ repeatCount: 2 }), { status: NodeStatus.DONE }, now)).toMatchObject({
      status: NodeStatus.OPEN,
      repeatCount: 1,
    });
    expect(recurrenceOnCompletion(task(), { status: NodeStatus.DONE }, now)).not.toHaveProperty('repeatCount');
  });

  it('completing past repeatUntil is just done', () => {
    const t = task({ repeatUntil: d('2026-03-10T12:00:00Z') });
    expect(recurrenceOnCompletion(t, { status: NodeStatus.DONE }, d('2026-03-10T10:00:00Z'))).toBeNull();
  });

  it('settings sent together with the completion win', () => {
    expect(
      recurrenceOnCompletion(
        task({ repeatCount: 5 }),
        { status: NodeStatus.DONE, repeatCount: 1 },
        d('2026-03-10T10:00:00Z'),
      ),
    ).toBeNull();
  });
});
