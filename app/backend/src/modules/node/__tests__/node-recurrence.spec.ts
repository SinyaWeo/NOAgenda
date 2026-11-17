import { addMonths, isRecurring, nextOccurrence, recurrenceOnCompletion } from '../node-recurrence';
import { NodeStatus, NodeType, RepeatMode } from '../node.entity';

const d = (s: string) => new Date(s);
const NOW = d('2026-03-10T12:00:00Z');
const task = (over: Record<string, unknown> = {}) =>
  ({
    type: NodeType.TASK,
    status: NodeStatus.OPEN,
    dueDate: d('2026-03-10T09:00:00Z'),
    startDate: null,
    repeatMode: RepeatMode.DEFAULT,
    repeatAfter: 7,
    ...over,
  }) as any;

describe('addMonths', () => {
  it('adds calendar months', () => expect(addMonths(d('2026-01-15T08:00:00Z'), 2)).toEqual(d('2026-03-15T08:00:00Z')));
  it('clamps to the end of a shorter month', () => {
    expect(addMonths(d('2026-01-31T08:00:00Z'), 1)).toEqual(d('2026-02-28T08:00:00Z'));
    expect(addMonths(d('2028-01-31T08:00:00Z'), 1)).toEqual(d('2028-02-29T08:00:00Z'));
  });
  it('crosses the year', () => expect(addMonths(d('2026-11-30T00:00:00Z'), 3)).toEqual(d('2027-02-28T00:00:00Z')));
});

describe('isRecurring', () => {
  it('needs a task and a positive repeatAfter', () => {
    expect(isRecurring(task())).toBe(true);
    expect(isRecurring(task({ repeatAfter: 0 }))).toBe(false);
    expect(isRecurring(task({ repeatAfter: null }))).toBe(false);
    expect(isRecurring(task({ type: NodeType.PROJECT }))).toBe(false);
  });
});

describe('nextOccurrence', () => {
  it('default: due date + N days', () => {
    // due 03-10 09:00 is before now (12:00), so one step lands on 03-17
    expect(nextOccurrence(task(), NOW)!.dueDate).toEqual(d('2026-03-17T09:00:00Z'));
  });

  it('default: a task finished early still moves one step from its due date', () => {
    expect(nextOccurrence(task({ dueDate: d('2026-03-20T09:00:00Z') }), NOW)!.dueDate).toEqual(
      d('2026-03-27T09:00:00Z'),
    );
  });

  it('default: a long-overdue task skips to the first date in the future, on the original rhythm', () => {
    const next = nextOccurrence(task({ dueDate: d('2026-01-01T09:00:00Z') }), NOW)!;
    expect(next.dueDate).toEqual(d('2026-03-12T09:00:00Z')); // 01-01 + 10 weeks
    expect(next.dueDate.getTime()).toBeGreaterThan(NOW.getTime());
    expect(next.shiftMs).toBe(next.dueDate.getTime() - d('2026-01-01T09:00:00Z').getTime());
  });

  it('monthly: due date + N months, past dates skipped', () => {
    const t = task({ repeatMode: RepeatMode.MONTHLY, repeatAfter: 1, dueDate: d('2025-12-31T09:00:00Z') });
    expect(nextOccurrence(t, NOW)!.dueDate).toEqual(d('2026-03-31T09:00:00Z'));
  });

  it('from_current_date: N days after completion, whatever the due date', () => {
    const t = task({ repeatMode: RepeatMode.FROM_CURRENT_DATE, repeatAfter: 3, dueDate: d('2025-01-01T00:00:00Z') });
    expect(nextOccurrence(t, NOW)!.dueDate).toEqual(d('2026-03-13T12:00:00Z'));
  });

  it('without a due date it counts from now and has nothing to shift reminders by', () => {
    const next = nextOccurrence(task({ dueDate: null }), NOW)!;
    expect(next.dueDate).toEqual(d('2026-03-17T12:00:00Z'));
    expect(next.shiftMs).toBeNull();
  });

  it('moves the start date along with the due date', () => {
    const t = task({ startDate: d('2026-03-08T09:00:00Z') });
    expect(nextOccurrence(t, NOW)!.startDate).toEqual(d('2026-03-15T09:00:00Z'));
  });

  it('treats a missing repeat mode as days', () => {
    expect(nextOccurrence(task({ repeatMode: null }), NOW)!.dueDate).toEqual(d('2026-03-17T09:00:00Z'));
  });

  it('does not repeat when it cannot (not repeating, or the date would be out of range)', () => {
    expect(nextOccurrence(task({ repeatAfter: 0 }), NOW)).toBeNull();
    expect(nextOccurrence(task({ repeatAfter: 100000000 }), NOW)).toBeNull();
  });
});

describe('recurrenceOnCompletion', () => {
  it('reopens a repeating task when it is marked done', () => {
    const r = recurrenceOnCompletion(task(), { status: NodeStatus.DONE }, NOW)!;
    expect(r).toMatchObject({ status: NodeStatus.OPEN, percentDone: 0, dueDate: d('2026-03-17T09:00:00Z') });
    expect(r.shiftMs).toBe(7 * 24 * 3600 * 1000);
  });

  it('keeps other fields of the same change', () => {
    expect(recurrenceOnCompletion(task(), { status: NodeStatus.DONE, priority: 3 }, NOW)).toMatchObject({
      priority: 3,
    });
  });

  it('ignores changes that do not complete the task', () => {
    expect(recurrenceOnCompletion(task(), { status: NodeStatus.IN_PROGRESS }, NOW)).toBeNull();
    expect(recurrenceOnCompletion(task(), { title: 'x' }, NOW)).toBeNull();
  });

  it('ignores a task that was already done (no double advance)', () => {
    expect(recurrenceOnCompletion(task({ status: NodeStatus.DONE }), { status: NodeStatus.DONE }, NOW)).toBeNull();
  });

  it('ignores tasks that do not repeat', () => {
    expect(recurrenceOnCompletion(task({ repeatAfter: null }), { status: NodeStatus.DONE }, NOW)).toBeNull();
  });

  it('uses repeat settings and due date from the same request over the stored ones', () => {
    const r = recurrenceOnCompletion(
      task({ repeatAfter: null }),
      { status: NodeStatus.DONE, repeatAfter: 2, dueDate: d('2026-03-20T09:00:00Z') },
      NOW,
    )!;
    expect(r.dueDate).toEqual(d('2026-03-22T09:00:00Z'));
  });
});
