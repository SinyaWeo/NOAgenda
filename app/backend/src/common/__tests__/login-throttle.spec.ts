import { LoginThrottle } from '../login-throttle';

describe('LoginThrottle', () => {
  let t = 1_000_000;
  const now = () => t;
  const make = () => new LoginThrottle(5, 15 * 60_000, now, 50);
  beforeEach(() => {
    t = 1_000_000;
  });

  it('locks a (username, IP) pair after the limit, and only that pair', () => {
    const th = make();
    for (let i = 0; i < 4; i++) th.recordFailure('ann', '1.1.1.1');
    expect(th.isLocked('ann', '1.1.1.1')).toBe(false);
    th.recordFailure('ann', '1.1.1.1');
    expect(th.isLocked('ann', '1.1.1.1')).toBe(true);
    // the real owner on another connection, and other accounts from the attacker, are untouched
    expect(th.isLocked('ann', '2.2.2.2')).toBe(false);
    expect(th.isLocked('bob', '1.1.1.1')).toBe(false);
  });

  it('ignores case and surrounding spaces in the username', () => {
    const th = make();
    for (let i = 0; i < 5; i++) th.recordFailure('Ann ', '1.1.1.1');
    expect(th.isLocked('ann', '1.1.1.1')).toBe(true);
  });

  it('unlocks when the window has passed', () => {
    const th = make();
    for (let i = 0; i < 5; i++) th.recordFailure('ann', '1.1.1.1');
    t += 15 * 60_000 - 1;
    expect(th.isLocked('ann', '1.1.1.1')).toBe(true);
    t += 2;
    expect(th.isLocked('ann', '1.1.1.1')).toBe(false);
  });

  it('old failures that never reached the limit do not add up forever', () => {
    const th = make();
    for (let i = 0; i < 4; i++) th.recordFailure('ann', '1.1.1.1');
    t += 16 * 60_000;
    th.recordFailure('ann', '1.1.1.1'); // counts as the 1st again, not the 5th
    expect(th.isLocked('ann', '1.1.1.1')).toBe(false);
  });

  it('a successful sign-in clears the pair; a reset clears every address of the account', () => {
    const th = make();
    for (let i = 0; i < 5; i++) {
      th.recordFailure('ann', '1.1.1.1');
      th.recordFailure('ann', '3.3.3.3');
    }
    th.clear('ann', '1.1.1.1');
    expect(th.isLocked('ann', '1.1.1.1')).toBe(false);
    expect(th.isLocked('ann', '3.3.3.3')).toBe(true);
    th.clearUser('ann');
    expect(th.isLocked('ann', '3.3.3.3')).toBe(false);
  });

  it('is bounded: a flood of random usernames cannot grow it without limit', () => {
    const th = make(); // maxEntries = 50
    for (let i = 0; i < 500; i++) th.recordFailure(`user${i}`, '9.9.9.9');
    expect((th as unknown as { entries: Map<string, unknown> }).entries.size).toBeLessThanOrEqual(50);
  });
});
