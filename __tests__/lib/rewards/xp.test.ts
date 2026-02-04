import { calculateXp, getStreakMultiplier, getStreakMultiplierInfo, calculateLevel, xpProgress } from '@/lib/rewards';

describe('xp', () => {
  it('calculates base XP as 10 per minute', () => {
    expect(calculateXp(60, 0)).toBe(10); // 1 minute = 10 XP
    expect(calculateXp(600, 0)).toBe(100); // 10 minutes = 100 XP
  });

  it('applies 1.2x multiplier for 3-day streak', () => {
    expect(calculateXp(60, 3)).toBe(12);
  });

  it('applies 1.5x multiplier for 7+ day streak', () => {
    expect(calculateXp(60, 7)).toBe(15);
    expect(calculateXp(60, 30)).toBe(15);
  });

  it('getStreakMultiplier returns correct values', () => {
    expect(getStreakMultiplier(0)).toBe(1.0);
    expect(getStreakMultiplier(2)).toBe(1.0);
    expect(getStreakMultiplier(3)).toBe(1.2);
    expect(getStreakMultiplier(6)).toBe(1.2);
    expect(getStreakMultiplier(7)).toBe(1.5);
    expect(getStreakMultiplier(100)).toBe(1.5);
  });

  it('getStreakMultiplierInfo returns current multiplier and next threshold info', () => {
    // 0-2 days: 1.0x, next is 1.2x at 3 days
    expect(getStreakMultiplierInfo(0)).toEqual({ current: 1.0, next: 1.2, daysToNext: 3 });
    expect(getStreakMultiplierInfo(1)).toEqual({ current: 1.0, next: 1.2, daysToNext: 2 });
    expect(getStreakMultiplierInfo(2)).toEqual({ current: 1.0, next: 1.2, daysToNext: 1 });

    // 3-6 days: 1.2x, next is 1.5x at 7 days
    expect(getStreakMultiplierInfo(3)).toEqual({ current: 1.2, next: 1.5, daysToNext: 4 });
    expect(getStreakMultiplierInfo(5)).toEqual({ current: 1.2, next: 1.5, daysToNext: 2 });
    expect(getStreakMultiplierInfo(6)).toEqual({ current: 1.2, next: 1.5, daysToNext: 1 });

    // 7+ days: 1.5x, no next threshold
    expect(getStreakMultiplierInfo(7)).toEqual({ current: 1.5, next: null, daysToNext: 0 });
    expect(getStreakMultiplierInfo(100)).toEqual({ current: 1.5, next: null, daysToNext: 0 });
  });

  it('calculates level from total XP', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(999)).toBe(1);
    expect(calculateLevel(1000)).toBe(2);
    expect(calculateLevel(5000)).toBe(6);
  });

  it('xpProgress returns current and needed XP', () => {
    const progress1 = xpProgress(0);
    expect(progress1.current).toBe(0);
    expect(progress1.needed).toBe(1000);

    const progress2 = xpProgress(1500);
    expect(progress2.current).toBe(500);
    expect(progress2.needed).toBe(1000);
  });
});
