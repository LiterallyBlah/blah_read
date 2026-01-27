import { updateStreak, getDateString } from '@/lib/streak';

describe('streak', () => {
  it('increments streak for consecutive days', () => {
    const result = updateStreak('2026-01-26', '2026-01-27', 5, 5);
    expect(result.currentStreak).toBe(6);
  });

  it('resets streak if day was skipped', () => {
    const result = updateStreak('2026-01-25', '2026-01-27', 5, 5);
    expect(result.currentStreak).toBe(1);
  });

  it('maintains streak for same day', () => {
    const result = updateStreak('2026-01-27', '2026-01-27', 5, 5);
    expect(result.currentStreak).toBe(5);
  });

  it('updates longest streak when current exceeds it', () => {
    const result = updateStreak('2026-01-26', '2026-01-27', 10, 8);
    expect(result.longestStreak).toBe(11);
  });

  it('starts streak at 1 for first read', () => {
    const result = updateStreak(null, '2026-01-27', 0, 0);
    expect(result.currentStreak).toBe(1);
    expect(result.lastReadDate).toBe('2026-01-27');
  });

  it('getDateString returns YYYY-MM-DD format', () => {
    const date = new Date('2026-01-27T12:00:00Z');
    expect(getDateString(date)).toBe('2026-01-27');
  });
});
