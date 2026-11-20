import { streakOf } from './task-completion.service';

const at = (completed: string, due?: string) => ({
  completedAt: new Date(completed),
  dueDate: due ? new Date(due) : null,
});

describe('streakOf', () => {
  it('counts the latest completions made on time, newest first', () => {
    expect(
      streakOf([
        at('2026-03-10T10:00:00Z', '2026-03-10T12:00:00Z'),
        at('2026-03-03T10:00:00Z', '2026-03-03T12:00:00Z'),
        at('2026-02-27T10:00:00Z', '2026-02-24T12:00:00Z'), // late: breaks the streak
        at('2026-02-17T10:00:00Z', '2026-02-17T12:00:00Z'),
      ]),
    ).toBe(2);
  });
  it('a completion without a due date is on time, and an empty history has no streak', () => {
    expect(streakOf([at('2026-03-10T10:00:00Z')])).toBe(1);
    expect(streakOf([])).toBe(0);
  });
});
