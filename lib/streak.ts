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
