/**
 * Hero Events Detection
 *
 * Detects notable events from a session that deserve celebration.
 * Events are prioritized so the most important one can be shown as the "hero moment".
 */

import { SessionRewardResult } from './sessionRewards';
import { Genre } from './genres';
import { Companion } from './types';

export type HeroEventType =
  | 'companion_unlocked'
  | 'slot_unlocked'
  | 'bonus_drop'
  | 'player_level_up'
  | 'genre_threshold'
  | 'streak_threshold'
  | 'book_level_up'
  | 'genre_level_up';

export interface HeroEvent {
  type: HeroEventType;
  priority: number;
  data: Record<string, unknown>;
}

/**
 * Priority order for hero events (lower = more important)
 * 1. Companion unlocked - rarest, most exciting
 * 2. Slot unlocked - major progression milestone
 * 3. Bonus drop - rare occurrence
 * 4. Player level up - global progression
 * 5. Genre threshold (10/20) - unlocks new companion rarities
 * 6. Streak threshold (7 days) - XP multiplier unlocked
 * 7. Book level up - common but satisfying
 * 8. Genre level up - incremental progress
 */
export const HERO_EVENT_PRIORITY: Record<HeroEventType, number> = {
  companion_unlocked: 1,
  slot_unlocked: 2,
  bonus_drop: 3,
  player_level_up: 4,
  genre_threshold: 5,
  streak_threshold: 6,
  book_level_up: 7,
  genre_level_up: 8,
};

/**
 * Genre level thresholds that unlock new companion rarities
 */
const GENRE_THRESHOLDS = [10, 20];

/**
 * Streak threshold that unlocks 1.5x multiplier
 */
const STREAK_THRESHOLD = 7;

/**
 * Detect all hero-worthy events from a session result.
 *
 * @param result - The session reward result
 * @param unlockedCompanions - Companions unlocked during this session
 * @param previousStreak - Streak count before session
 * @param newStreak - Streak count after session
 * @returns Array of hero events sorted by priority (highest first)
 */
export function detectHeroEvents(
  result: SessionRewardResult,
  unlockedCompanions: Companion[],
  previousStreak: number,
  newStreak: number
): HeroEvent[] {
  const events: HeroEvent[] = [];

  // Check companion unlocks (priority 1)
  for (const companion of unlockedCompanions) {
    events.push({
      type: 'companion_unlocked',
      priority: HERO_EVENT_PRIORITY.companion_unlocked,
      data: { companion },
    });
  }

  // Check bonus drop (priority 3)
  if (result.bonusDropTriggered) {
    events.push({
      type: 'bonus_drop',
      priority: HERO_EVENT_PRIORITY.bonus_drop,
      data: {},
    });
  }

  // Check player level up (priority 4)
  const newPlayerLevel = result.updatedProgress?.level ?? result.previousPlayerLevel;
  if (newPlayerLevel > result.previousPlayerLevel) {
    events.push({
      type: 'player_level_up',
      priority: HERO_EVENT_PRIORITY.player_level_up,
      data: {
        previousLevel: result.previousPlayerLevel,
        newLevel: newPlayerLevel,
      },
    });
  }

  // Check genre thresholds and level ups
  for (const [genre, increase] of Object.entries(result.genreLevelIncreases)) {
    if (increase > 0) {
      const previousLevel = result.previousGenreLevels[genre as Genre] ?? 0;
      const newLevel = previousLevel + increase;

      // Check for threshold crossings (priority 5)
      for (const threshold of GENRE_THRESHOLDS) {
        if (previousLevel < threshold && newLevel >= threshold) {
          events.push({
            type: 'genre_threshold',
            priority: HERO_EVENT_PRIORITY.genre_threshold,
            data: { genre, threshold, newLevel },
          });
        }
      }

      // Regular genre level up (priority 8)
      events.push({
        type: 'genre_level_up',
        priority: HERO_EVENT_PRIORITY.genre_level_up,
        data: { genre, previousLevel, newLevel },
      });
    }
  }

  // Check streak threshold (priority 6)
  if (previousStreak < STREAK_THRESHOLD && newStreak >= STREAK_THRESHOLD) {
    events.push({
      type: 'streak_threshold',
      priority: HERO_EVENT_PRIORITY.streak_threshold,
      data: { streak: newStreak, multiplier: 1.5 },
    });
  }

  // Check book level up (priority 7)
  if (result.bookLevelsGained > 0) {
    events.push({
      type: 'book_level_up',
      priority: HERO_EVENT_PRIORITY.book_level_up,
      data: {
        previousLevel: result.previousBookLevel,
        newLevel: result.newBookLevel,
      },
    });
  }

  // Sort by priority (lower number = higher priority = first in array)
  return events.sort((a, b) => a.priority - b.priority);
}
