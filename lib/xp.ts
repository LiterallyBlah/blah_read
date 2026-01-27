const XP_PER_MINUTE = 10;
const XP_PER_LEVEL = 1000;

export function getStreakMultiplier(streak: number): number {
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.2;
  return 1.0;
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
