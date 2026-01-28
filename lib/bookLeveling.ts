/**
 * Book Leveling Logic
 *
 * Core progression mechanic: 1 level per hour of reading,
 * with a page-based floor at completion.
 */

// Constants
export const SECONDS_PER_LEVEL = 3600; // 1 hour
export const PAGES_PER_LEVEL = 30;

// Result interface for level changes
export interface LevelUpResult {
  previousLevel: number;
  newLevel: number;
  levelsGained: number;
}

/**
 * Calculate book level based on total reading time.
 * Returns floor(totalSeconds / 3600)
 */
export function calculateBookLevel(totalSeconds: number): number {
  return Math.floor(totalSeconds / SECONDS_PER_LEVEL);
}

/**
 * Calculate the minimum level floor based on page count.
 * Returns floor(pageCount / 30), or 0 if null.
 */
export function calculatePageFloor(pageCount: number | null): number {
  if (pageCount === null) {
    return 0;
  }
  return Math.floor(pageCount / PAGES_PER_LEVEL);
}

/**
 * Calculate completion bonus levels when book is finished.
 * Returns bonus levels (pageFloor - hourlyLevels, min 0).
 */
export function calculateCompletionBonus(
  totalSeconds: number,
  pageCount: number | null
): number {
  const hourlyLevels = calculateBookLevel(totalSeconds);
  const pageFloor = calculatePageFloor(pageCount);
  return Math.max(0, pageFloor - hourlyLevels);
}

/**
 * Process a reading session and calculate level changes.
 * Returns level change info.
 */
export function processReadingTime(
  previousTotalSeconds: number,
  sessionSeconds: number
): LevelUpResult {
  const previousLevel = calculateBookLevel(previousTotalSeconds);
  const newTotalSeconds = previousTotalSeconds + sessionSeconds;
  const newLevel = calculateBookLevel(newTotalSeconds);
  const levelsGained = newLevel - previousLevel;

  return {
    previousLevel,
    newLevel,
    levelsGained,
  };
}
