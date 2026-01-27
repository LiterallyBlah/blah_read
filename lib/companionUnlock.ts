import type { Book, BookCompanions, Companion, LootBox } from './types';
import { debug } from './debug';

/**
 * Reading time milestones in seconds (front-loaded)
 * 30min, 1hr, 2hr, 3.5hr, 5hr, 7hr, 10hr
 */
export const READING_TIME_MILESTONES = [
  30 * 60,      // 30 minutes
  60 * 60,      // 1 hour
  2 * 60 * 60,  // 2 hours
  3.5 * 60 * 60, // 3.5 hours
  5 * 60 * 60,  // 5 hours (legendary milestone)
  7 * 60 * 60,  // 7 hours
  10 * 60 * 60, // 10 hours
];

/**
 * After exhausting reading-time queue, earn 1 loot box per additional hour
 */
export const LOOT_BOX_INTERVAL_SECONDS = 60 * 60; // 1 hour

/**
 * Check which milestone indices were crossed between previous and new reading time
 */
export function checkReadingTimeUnlocks(
  previousTimeSeconds: number,
  newTimeSeconds: number
): number[] {
  const crossed: number[] = [];

  for (let i = 0; i < READING_TIME_MILESTONES.length; i++) {
    const milestone = READING_TIME_MILESTONES[i];
    if (previousTimeSeconds < milestone && newTimeSeconds >= milestone) {
      crossed.push(i);
    }
  }

  return crossed;
}

/**
 * Get information about the next milestone
 */
export function getNextMilestone(
  currentTimeSeconds: number
): { index: number; timeSeconds: number; timeRemaining: number } | null {
  for (let i = 0; i < READING_TIME_MILESTONES.length; i++) {
    const milestone = READING_TIME_MILESTONES[i];
    if (currentTimeSeconds < milestone) {
      return {
        index: i,
        timeSeconds: milestone,
        timeRemaining: milestone - currentTimeSeconds,
      };
    }
  }
  return null; // All milestones passed
}

/**
 * Check if reading past the queue should earn loot boxes
 */
export function checkPostQueueLootBoxes(
  previousTimeSeconds: number,
  newTimeSeconds: number,
  queueExhausted: boolean
): number {
  if (!queueExhausted) {
    return 0;
  }

  const lastMilestone = READING_TIME_MILESTONES[READING_TIME_MILESTONES.length - 1];
  const effectivePrevious = Math.max(previousTimeSeconds, lastMilestone);
  const effectiveNew = Math.max(newTimeSeconds, lastMilestone);

  const previousHours = Math.floor(effectivePrevious / LOOT_BOX_INTERVAL_SECONDS);
  const newHours = Math.floor(effectiveNew / LOOT_BOX_INTERVAL_SECONDS);

  return Math.max(0, newHours - previousHours);
}

/**
 * Process a reading session and return any unlocked companions and earned loot boxes
 */
export function processReadingSession(
  book: Book,
  sessionDurationSeconds: number
): {
  unlockedCompanions: Companion[];
  earnedLootBoxes: LootBox[];
  updatedCompanions: BookCompanions;
} {
  debug.log('unlock', 'Processing reading session', {
    bookTitle: book.title,
    sessionDuration: sessionDurationSeconds,
    previousReadingTime: book.totalReadingTime,
  });

  if (!book.companions) {
    debug.warn('unlock', 'Book has no companions data');
    return {
      unlockedCompanions: [],
      earnedLootBoxes: [],
      updatedCompanions: book.companions!,
    };
  }

  const previousTime = book.totalReadingTime;
  const newTime = previousTime + sessionDurationSeconds;

  const crossedMilestones = checkReadingTimeUnlocks(previousTime, newTime);
  debug.log('unlock', 'Milestone check', {
    previousTime,
    newTime,
    crossedMilestones,
    milestonesValues: crossedMilestones.map(i => READING_TIME_MILESTONES[i] / 60),
  });

  const companions = { ...book.companions };
  const readingQueue = { ...companions.readingTimeQueue };
  const unlockedCompanions: Companion[] = [];

  for (const milestoneIndex of crossedMilestones) {
    const companionIndex = readingQueue.companions.findIndex(
      c => c.unlockMethod === null
    );

    if (companionIndex !== -1) {
      const companion = { ...readingQueue.companions[companionIndex] };
      companion.unlockMethod = 'reading_time';
      companion.unlockedAt = Date.now();

      debug.log('unlock', `Unlocked companion: "${companion.name}"`, {
        type: companion.type,
        rarity: companion.rarity,
        milestoneIndex,
      });

      readingQueue.companions[companionIndex] = companion;
      unlockedCompanions.push(companion);

      companions.unlockedCompanions = [
        ...companions.unlockedCompanions,
        companion,
      ];
    } else {
      debug.log('unlock', 'No more companions in reading queue to unlock');
    }
  }

  companions.readingTimeQueue = readingQueue;

  const queueExhausted = readingQueue.companions.every(
    c => c.unlockMethod !== null
  );
  const lootBoxCount = checkPostQueueLootBoxes(
    previousTime,
    newTime,
    queueExhausted
  );

  debug.log('unlock', 'Post-queue loot box check', {
    queueExhausted,
    lootBoxCount,
  });

  const earnedLootBoxes: LootBox[] = [];
  for (let i = 0; i < lootBoxCount; i++) {
    earnedLootBoxes.push({
      id: `lootbox-${Date.now()}-${i}`,
      earnedAt: Date.now(),
      source: 'reading_overflow',
    });
  }

  debug.log('unlock', 'Session processing complete', {
    unlockedCount: unlockedCompanions.length,
    lootBoxesEarned: earnedLootBoxes.length,
  });

  return {
    unlockedCompanions,
    earnedLootBoxes,
    updatedCompanions: companions,
  };
}
