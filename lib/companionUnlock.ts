import type { Book, BookCompanions, Companion, CompanionRarity, LootBox } from './shared';
import { debug, generateBatchId } from './shared';

/**
 * Reading time milestones in seconds (front-loaded)
 * 30min, 1hr, 2hr, 3.5hr, 5hr, 7hr, 10hr
 */
export const READING_TIME_MILESTONES = [
  30 * 60,      // 30 minutes
  60 * 60,      // 1 hour
  2 * 60 * 60,  // 2 hours
  3.5 * 60 * 60, // 3.5 hours
  5 * 60 * 60,  // 5 hours
  7 * 60 * 60,  // 7 hours
  10 * 60 * 60, // 10 hours
];

/**
 * Rarity odds per milestone index
 * Earlier milestones favor commons, later milestones favor rares/legendaries
 */
export const MILESTONE_RARITY_ODDS: Array<Record<CompanionRarity, number>> = [
  { common: 0.90, rare: 0.10, legendary: 0.00 },  // 30 min
  { common: 0.80, rare: 0.20, legendary: 0.00 },  // 1 hr
  { common: 0.60, rare: 0.38, legendary: 0.02 },  // 2 hr
  { common: 0.40, rare: 0.55, legendary: 0.05 },  // 3.5 hr
  { common: 0.20, rare: 0.65, legendary: 0.15 },  // 5 hr
  { common: 0.10, rare: 0.60, legendary: 0.30 },  // 7 hr
  { common: 0.00, rare: 0.50, legendary: 0.50 },  // 10 hr
];

/**
 * Roll for a rarity based on milestone odds
 */
export function rollMilestoneRarity(milestoneIndex: number): CompanionRarity {
  const odds = MILESTONE_RARITY_ODDS[milestoneIndex] || MILESTONE_RARITY_ODDS[MILESTONE_RARITY_ODDS.length - 1];
  const roll = Math.random();

  if (roll < odds.legendary) {
    return 'legendary';
  } else if (roll < odds.legendary + odds.rare) {
    return 'rare';
  } else {
    return 'common';
  }
}

/**
 * Find an available companion of the target rarity, with fallback to lower rarities
 * Prioritizes companions with images
 */
export function findCompanionByRarity(
  companions: Companion[],
  targetRarity: CompanionRarity
): number {
  const rarityFallback: CompanionRarity[] =
    targetRarity === 'legendary' ? ['legendary', 'rare', 'common'] :
    targetRarity === 'rare' ? ['rare', 'common'] :
    ['common'];

  for (const rarity of rarityFallback) {
    // First try to find one with an image
    const withImage = companions.findIndex(
      c => c.unlockMethod === null && c.rarity === rarity && c.imageUrl
    );
    if (withImage !== -1) return withImage;

    // Fall back to any of this rarity
    const any = companions.findIndex(
      c => c.unlockMethod === null && c.rarity === rarity
    );
    if (any !== -1) return any;
  }

  // Last resort: any unlocked companion
  return companions.findIndex(c => c.unlockMethod === null);
}

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
    // Return valid empty structure instead of undefined
    return {
      unlockedCompanions: [],
      earnedLootBoxes: [],
      updatedCompanions: {
        researchComplete: false,
        researchConfidence: 'low',
        readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
        poolQueue: { companions: [], nextGenerateIndex: 0 },
        unlockedCompanions: [],
      },
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
    // Roll for rarity based on milestone
    const targetRarity = rollMilestoneRarity(milestoneIndex);
    debug.log('unlock', `Milestone ${milestoneIndex} rolled rarity: ${targetRarity}`);

    // Find a companion of that rarity (with fallback)
    const companionIndex = findCompanionByRarity(readingQueue.companions, targetRarity);

    if (companionIndex !== -1) {
      const companion = { ...readingQueue.companions[companionIndex] };
      companion.unlockMethod = 'reading_time';
      companion.unlockedAt = Date.now();

      debug.log('unlock', `Unlocked companion: "${companion.name}"`, {
        type: companion.type,
        rarity: companion.rarity,
        targetRarity,
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
      id: generateBatchId('lootbox', i),
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
