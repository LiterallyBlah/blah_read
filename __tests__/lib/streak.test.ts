import { updateStreak, getDateString, updateStreakWithShield } from '@/lib/streak';

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

describe('updateStreakWithShield', () => {
  it('should protect streak when shield is active and day was skipped', () => {
    const now = Date.now();
    const shieldExpiry = now + 24 * 60 * 60 * 1000;

    const result = updateStreakWithShield(
      '2026-01-25',
      '2026-01-27',
      5,
      5,
      shieldExpiry,
      now
    );

    expect(result.currentStreak).toBe(5);
    expect(result.shieldConsumed).toBe(true);
    expect(result.newShieldExpiry).toBeNull();
  });

  it('should not consume shield for consecutive days', () => {
    const now = Date.now();
    const shieldExpiry = now + 24 * 60 * 60 * 1000;

    const result = updateStreakWithShield(
      '2026-01-26',
      '2026-01-27',
      5,
      5,
      shieldExpiry,
      now
    );

    expect(result.currentStreak).toBe(6);
    expect(result.shieldConsumed).toBe(false);
    expect(result.newShieldExpiry).toBe(shieldExpiry);
  });

  it('should reset streak when shield is expired', () => {
    const now = Date.now();
    const shieldExpiry = now - 1000;

    const result = updateStreakWithShield(
      '2026-01-25',
      '2026-01-27',
      5,
      5,
      shieldExpiry,
      now
    );

    expect(result.currentStreak).toBe(1);
    expect(result.shieldConsumed).toBe(false);
  });

  it('should reset streak when no shield exists', () => {
    const now = Date.now();

    const result = updateStreakWithShield(
      '2026-01-25',
      '2026-01-27',
      5,
      5,
      null,
      now
    );

    expect(result.currentStreak).toBe(1);
    expect(result.shieldConsumed).toBe(false);
  });

  it('should maintain streak for same day', () => {
    const now = Date.now();
    const shieldExpiry = now + 24 * 60 * 60 * 1000;

    const result = updateStreakWithShield(
      '2026-01-27',
      '2026-01-27',
      5,
      5,
      shieldExpiry,
      now
    );

    expect(result.currentStreak).toBe(5);
    expect(result.shieldConsumed).toBe(false);
    expect(result.newShieldExpiry).toBe(shieldExpiry);
  });
});
