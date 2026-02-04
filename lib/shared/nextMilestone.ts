/**
 * Next Milestone Calculator
 *
 * Calculates the nearest reward-giving milestones for the current book.
 */

import { Book, UserProgress, GenreLevels } from './types';
import { Genre } from './genres';
// Direct imports to avoid circular dependency through barrel exports
import { SECONDS_PER_LEVEL } from '../books/leveling';
import { READING_TIME_MILESTONES, getNextMilestone } from '../companion/unlock';

export type MilestoneType = 'book_level' | 'companion_unlock' | 'genre_rarity';
export type MilestoneReward = 'loot_box' | 'companion' | 'rarity_unlock';

export interface NextMilestone {
  type: MilestoneType;
  reward: MilestoneReward;
  remainingMinutes?: number;
  progress?: number; // 0-1 progress toward milestone
  data?: Record<string, unknown>;
}

/**
 * Genre level thresholds that unlock new companion rarities
 */
const GENRE_THRESHOLDS = [10, 20];

/**
 * Calculate the nearest reward-giving milestones.
 * Returns up to 2 milestones, sorted by proximity.
 */
export function calculateNextMilestones(
  book: Book,
  progress: UserProgress
): NextMilestone[] {
  const milestones: NextMilestone[] = [];
  const bookGenres = book.normalizedGenres || [];

  // 1. Next book level (gives loot box)
  const currentSeconds = book.progression?.totalSeconds ?? book.totalReadingTime;
  const currentLevel = book.progression?.level ?? 0;
  const secondsToNextLevel = ((currentLevel + 1) * SECONDS_PER_LEVEL) - currentSeconds;

  if (secondsToNextLevel > 0) {
    const progressInLevel = (currentSeconds % SECONDS_PER_LEVEL) / SECONDS_PER_LEVEL;
    milestones.push({
      type: 'book_level',
      reward: 'loot_box',
      remainingMinutes: Math.ceil(secondsToNextLevel / 60),
      progress: progressInLevel,
      data: { nextLevel: currentLevel + 1 },
    });
  }

  // 2. Next companion unlock milestone
  const nextCompanionMilestone = getNextMilestone(book.totalReadingTime);
  if (nextCompanionMilestone) {
    const remainingSeconds = nextCompanionMilestone.timeRemaining;
    const milestoneSeconds = READING_TIME_MILESTONES[nextCompanionMilestone.index];
    const progressToMilestone = book.totalReadingTime / milestoneSeconds;

    milestones.push({
      type: 'companion_unlock',
      reward: 'companion',
      remainingMinutes: Math.ceil(remainingSeconds / 60),
      progress: progressToMilestone,
      data: { milestoneIndex: nextCompanionMilestone.index },
    });
  }

  // 3. Genre rarity unlocks (level 10 and 20)
  const genreLevels: Partial<GenreLevels> = progress.genreLevels || {};

  for (const genre of bookGenres) {
    const currentGenreLevel = genreLevels[genre as Genre] ?? 0;

    for (const threshold of GENRE_THRESHOLDS) {
      if (currentGenreLevel < threshold) {
        const levelsNeeded = threshold - currentGenreLevel;
        const progressToThreshold = currentGenreLevel / threshold;

        milestones.push({
          type: 'genre_rarity',
          reward: 'rarity_unlock',
          progress: progressToThreshold,
          data: {
            genre,
            threshold,
            levelsNeeded,
            currentLevel: currentGenreLevel,
          },
        });
        break; // Only show nearest threshold per genre
      }
    }
  }

  // Sort by proximity (time-based first, then level-based)
  milestones.sort((a, b) => {
    const aRemaining = a.remainingMinutes ?? (a.data?.levelsNeeded as number ?? 999) * 60;
    const bRemaining = b.remainingMinutes ?? (b.data?.levelsNeeded as number ?? 999) * 60;
    return aRemaining - bRemaining;
  });

  // Return top 2
  return milestones.slice(0, 2);
}
