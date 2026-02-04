export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate day difference using UTC dates to avoid DST issues.
 * Parses YYYY-MM-DD strings and compares using UTC to ensure
 * consistent day boundaries regardless of timezone.
 */
function getDayDifference(dateStr1: string, dateStr2: string): number {
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const date1 = Date.UTC(y1, m1 - 1, d1);
  const date2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((date2 - date1) / (1000 * 60 * 60 * 24));
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

  const diffDays = getDayDifference(lastReadDate, today);

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

  const diffDays = getDayDifference(lastReadDate, today);

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
