const XP_PER_MINUTE = 10;
const XP_PER_LEVEL = 1000;

export function getStreakMultiplier(streak: number): number {
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.2;
  return 1.0;
}

export interface StreakMultiplierInfo {
  current: number;
  next: number | null;
  daysToNext: number;
}

export function getStreakMultiplierInfo(streak: number): StreakMultiplierInfo {
  if (streak >= 7) return { current: 1.5, next: null, daysToNext: 0 };
  if (streak >= 3) return { current: 1.2, next: 1.5, daysToNext: 7 - streak };
  return { current: 1.0, next: 1.2, daysToNext: 3 - streak };
}

export function calculateXp(durationSeconds: number, streak: number): number {
  const minutes = durationSeconds / 60;
  const baseXp = minutes * XP_PER_MINUTE;
  const multiplier = getStreakMultiplier(streak);
  return Math.floor(baseXp * multiplier);
}

export function calculateLevel(totalXp: number): number {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
}

export function xpForNextLevel(currentLevel: number): number {
  return currentLevel * XP_PER_LEVEL;
}

export function xpProgress(totalXp: number): { current: number; needed: number } {
  const level = calculateLevel(totalXp);
  const xpAtLevelStart = (level - 1) * XP_PER_LEVEL;
  return {
    current: totalXp - xpAtLevelStart,
    needed: XP_PER_LEVEL,
  };
}
