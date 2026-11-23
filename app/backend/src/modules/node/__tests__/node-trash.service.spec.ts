import { trashRetentionDays } from '../node-trash.service';

describe('trashRetentionDays', () => {
  it('defaults to 30 days', () => {
    expect(trashRetentionDays(undefined)).toBe(30);
    expect(trashRetentionDays('')).toBe(30);
  });
  it('takes a positive number from the environment, rounded down', () => {
    expect(trashRetentionDays('7')).toBe(7);
    expect(trashRetentionDays('2.9')).toBe(2);
  });
  it('ignores nonsense', () => {
    expect(trashRetentionDays('0')).toBe(30);
    expect(trashRetentionDays('-3')).toBe(30);
    expect(trashRetentionDays('abc')).toBe(30);
  });
});
