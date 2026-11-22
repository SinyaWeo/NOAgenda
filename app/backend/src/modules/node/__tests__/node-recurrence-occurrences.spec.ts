import { occurrencesBetween } from '../node-recurrence';
import { Node, NodeStatus, NodeType, RepeatMode } from '../node.entity';

const d = (s: string) => new Date(s);
const task = (over: Record<string, unknown> = {}) =>
  ({
    type: NodeType.TASK,
    status: NodeStatus.OPEN,
    dueDate: d('2026-03-10T09:00:00Z'),
    startDate: null,
    repeatMode: RepeatMode.DEFAULT,
    repeatAfter: 7,
    ...over,
  }) as unknown as Node;
const days = (list: { dueDate: Date }[]) => list.map((o) => o.dueDate.toISOString().slice(0, 10));
const FROM = d('2026-03-01T00:00:00Z');
const TO = d('2026-04-15T00:00:00Z');

describe('occurrencesBetween', () => {
  it('default: every N days after the current due date, not the current one', () => {
    expect(days(occurrencesBetween(task(), FROM, TO))).toEqual([
      '2026-03-17',
      '2026-03-24',
      '2026-03-31',
      '2026-04-07',
      '2026-04-14',
    ]);
  });

  it('only returns dates inside the window', () => {
    expect(days(occurrencesBetween(task(), d('2026-03-25T00:00:00Z'), d('2026-04-08T00:00:00Z')))).toEqual([
      '2026-03-31',
      '2026-04-07',
    ]);
  });

  it('monthly counts from the original date (no drift after a clamp)', () => {
    const t = task({ repeatMode: RepeatMode.MONTHLY, repeatAfter: 1, dueDate: d('2026-01-31T09:00:00Z') });
    expect(days(occurrencesBetween(t, d('2026-02-01T00:00:00Z'), d('2026-05-01T00:00:00Z')))).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('month_end lands on the last day of each month', () => {
    const t = task({ repeatMode: RepeatMode.MONTH_END, repeatAfter: 1, dueDate: d('2026-01-31T09:00:00Z') });
    expect(days(occurrencesBetween(t, d('2026-02-01T00:00:00Z'), d('2026-04-30T23:00:00Z')))).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('monthly_weekday keeps "second Tuesday"', () => {
    const t = task({ repeatMode: RepeatMode.MONTHLY_WEEKDAY, repeatAfter: 1, dueDate: d('2026-03-10T09:00:00Z') });
    expect(days(occurrencesBetween(t, FROM, d('2026-06-30T00:00:00Z')))).toEqual([
      '2026-04-14',
      '2026-05-12',
      '2026-06-09',
    ]);
  });

  it('weekly: chosen weekdays, every N weeks', () => {
    // Tue 2026-03-10; Mon+Thu every 2 weeks
    const t = task({ repeatMode: RepeatMode.WEEKLY, repeatAfter: 2, repeatWeekdays: '1,4' });
    expect(days(occurrencesBetween(t, FROM, d('2026-04-10T00:00:00Z')))).toEqual([
      '2026-03-12',
      '2026-03-23',
      '2026-03-26',
      '2026-04-06',
      '2026-04-09',
    ]);
  });

  it('from_current_date projects N days from each previous date', () => {
    const t = task({ repeatMode: RepeatMode.FROM_CURRENT_DATE, repeatAfter: 10 });
    expect(days(occurrencesBetween(t, FROM, TO))).toEqual(['2026-03-20', '2026-03-30', '2026-04-09']);
  });

  it('keeps the local time of day across a clock change', () => {
    // 09:00 in Prague: +01:00 before 2026-03-29, +02:00 after
    const t = task({ repeatAfter: 7, dueDate: d('2026-03-24T08:00:00Z') });
    const out = occurrencesBetween(t, FROM, TO, 'Europe/Prague');
    expect(out[0].dueDate.toISOString()).toBe('2026-03-31T07:00:00.000Z');
  });

  it('stops at repeatUntil', () => {
    expect(days(occurrencesBetween(task({ repeatUntil: d('2026-03-25T00:00:00Z') }), FROM, TO))).toEqual([
      '2026-03-17',
      '2026-03-24',
    ]);
  });

  it('repeatCount counts the current occurrence', () => {
    expect(days(occurrencesBetween(task({ repeatCount: 3 }), FROM, TO))).toEqual(['2026-03-17', '2026-03-24']);
    expect(occurrencesBetween(task({ repeatCount: 1 }), FROM, TO)).toEqual([]);
  });

  it('shifts the start date with the due date', () => {
    const t = task({ startDate: d('2026-03-08T09:00:00Z') });
    expect(occurrencesBetween(t, FROM, TO)[0].startDate).toEqual(d('2026-03-15T09:00:00Z'));
  });

  it('yields nothing without a due date or repetition', () => {
    expect(occurrencesBetween(task({ dueDate: null }), FROM, TO)).toEqual([]);
    expect(occurrencesBetween(task({ repeatAfter: 0 }), FROM, TO)).toEqual([]);
    expect(occurrencesBetween(task({ type: NodeType.PROJECT }), FROM, TO)).toEqual([]);
  });

  it('honours the max guard', () => {
    expect(occurrencesBetween(task({ repeatAfter: 1 }), FROM, d('2027-01-01T00:00:00Z'), 'UTC', 5)).toHaveLength(5);
  });
});
