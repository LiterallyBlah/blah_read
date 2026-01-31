export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function updateStreak(
  lastReadDate: string | null,
  today: string,
  currentStreak: number,
  longestStreak: number = 0
): { currentStreak: number; longestStreak: number; lastReadDate: string } {
  if (!lastReadDate) {
    return { currentStreak: 1, longestStreak: Math.max(1, longestStreak), lastReadDate: today };
  }

  if (lastReadDate === today) {
    return { currentStreak, longestStreak, lastReadDate: today };
  }

  const last = new Date(lastReadDate);
  const current = new Date(today);
  const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, longestStreak),
      lastReadDate: today,
    };
  }

  return { currentStreak: 1, longestStreak: Math.max(1, longestStreak), lastReadDate: today };
}

export interface StreakUpdateResult {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string;
  shieldConsumed: boolean;
  newShieldExpiry: number | null;
}

/**
 * Update streak with shield protection.
 * If a day was skipped but shield is active, preserve the streak and consume the shield.
 */
export function updateStreakWithShield(
  lastReadDate: string | null,
  today: string,
  currentStreak: number,
  longestStreak: number = 0,
  shieldExpiry: number | null,
  now: number = Date.now()
): StreakUpdateResult {
  if (!lastReadDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, longestStreak),
      lastReadDate: today,
      shieldConsumed: false,
      newShieldExpiry: shieldExpiry,
    };
  }

  if (lastReadDate === today) {
    return {
      currentStreak,
      longestStreak,
      lastReadDate: today,
      shieldConsumed: false,
      newShieldExpiry: shieldExpiry,
    };
  }

  const last = new Date(lastReadDate);
  const current = new Date(today);
  const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, longestStreak),
      lastReadDate: today,
      shieldConsumed: false,
      newShieldExpiry: shieldExpiry,
    };
  }

  const hasActiveShield = shieldExpiry != null && shieldExpiry > now;

  if (hasActiveShield) {
    return {
      currentStreak,
      longestStreak,
      lastReadDate: today,
      shieldConsumed: true,
      newShieldExpiry: null,
    };
  }

  return {
    currentStreak: 1,
    longestStreak: Math.max(1, longestStreak),
    lastReadDate: today,
    shieldConsumed: false,
    newShieldExpiry: shieldExpiry,
  };
}
