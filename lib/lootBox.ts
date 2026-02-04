import type { Book, Companion, CompanionRarity, LootBox, UserProgress } from './shared';

/**
 * Loot box reward thresholds
 */
const STREAK_REWARDS: Record<number, number> = {
  3: 1,   // 3-day streak = 1 box
  7: 2,   // 7-day streak = 2 boxes
  14: 3,  // 14-day streak = 3 boxes
  30: 5,  // 30-day streak = 5 boxes
};

const XP_INTERVAL = 250; // 1 box per 250 XP

const BOOK_COUNT_MILESTONES = [3, 5, 10, 15, 20]; // 1 box each

const HOURS_READ_MILESTONES = [5, 10, 25, 50, 100]; // 1 box each

const BOOKS_FINISHED_REWARD = 2; // 2 boxes per book finished

/**
 * Weight multiplier for current book companions in loot pool
 */
const CURRENT_BOOK_WEIGHT = 3;

/**
 * Achievement milestone types
 */
export type AchievementType = 'streak' | 'xp' | 'book_finished' | 'books_added' | 'hours_read';

/**
 * A milestone that was achieved this session
 */
export interface AchievedMilestone {
  type: AchievementType;
  milestone: number; // The threshold reached (e.g., 7 for 7-day streak, 250 for 250 XP)
  boxesAwarded: number;
  description: string; // Human-readable description
}

/**
 * Result of checking loot box rewards - includes both boxes and milestone info
 */
export interface LootBoxRewardResult {
  boxes: LootBox[];
  milestones: AchievedMilestone[];
}

/**
 * Check what loot box rewards should be given based on progress changes.
 * Returns both the boxes and information about what milestones were hit.
 */
export function checkLootBoxRewards(
  previousProgress: UserProgress,
  newProgress: UserProgress
): LootBoxRewardResult {
  const boxes: LootBox[] = [];
  const milestones: AchievedMilestone[] = [];
  const now = Date.now();

  // Check streak milestones
  for (const [milestone, reward] of Object.entries(STREAK_REWARDS)) {
    const milestoneNum = parseInt(milestone);
    if (
      previousProgress.currentStreak < milestoneNum &&
      newProgress.currentStreak >= milestoneNum
    ) {
      milestones.push({
        type: 'streak',
        milestone: milestoneNum,
        boxesAwarded: reward,
        description: `${milestoneNum}-day reading streak`,
      });
      for (let i = 0; i < reward; i++) {
        boxes.push({
          id: `lootbox-streak-${milestone}-${now}-${i}`,
          earnedAt: now,
          source: `streak_${milestone}`,
        });
      }
    }
  }

  // Check XP milestones
  const previousXpMilestone = Math.floor(previousProgress.totalXp / XP_INTERVAL);
  const newXpMilestone = Math.floor(newProgress.totalXp / XP_INTERVAL);
  for (let m = previousXpMilestone + 1; m <= newXpMilestone; m++) {
    milestones.push({
      type: 'xp',
      milestone: m * XP_INTERVAL,
      boxesAwarded: 1,
      description: `reached ${m * XP_INTERVAL} total XP`,
    });
    boxes.push({
      id: `lootbox-xp-${m * XP_INTERVAL}-${now}`,
      earnedAt: now,
      source: `xp_${m * XP_INTERVAL}`,
    });
  }

  // Check books finished
  if (newProgress.booksFinished > previousProgress.booksFinished) {
    const booksJustFinished = newProgress.booksFinished - previousProgress.booksFinished;
    milestones.push({
      type: 'book_finished',
      milestone: newProgress.booksFinished,
      boxesAwarded: booksJustFinished * BOOKS_FINISHED_REWARD,
      description: booksJustFinished === 1 ? 'finished a book' : `finished ${booksJustFinished} books`,
    });
    for (let i = 0; i < booksJustFinished * BOOKS_FINISHED_REWARD; i++) {
      boxes.push({
        id: `lootbox-finished-${now}-${i}`,
        earnedAt: now,
        source: 'book_finished',
      });
    }
  }

  // Check books added milestones
  for (const milestone of BOOK_COUNT_MILESTONES) {
    if (
      previousProgress.booksAdded < milestone &&
      newProgress.booksAdded >= milestone
    ) {
      milestones.push({
        type: 'books_added',
        milestone,
        boxesAwarded: 1,
        description: `added ${milestone} books to library`,
      });
      boxes.push({
        id: `lootbox-books-${milestone}-${now}`,
        earnedAt: now,
        source: `books_added_${milestone}`,
      });
    }
  }

  // Check hours read milestones
  for (const milestone of HOURS_READ_MILESTONES) {
    if (
      previousProgress.totalHoursRead < milestone &&
      newProgress.totalHoursRead >= milestone
    ) {
      milestones.push({
        type: 'hours_read',
        milestone,
        boxesAwarded: 1,
        description: `${milestone} total hours read`,
      });
      boxes.push({
        id: `lootbox-hours-${milestone}-${now}`,
        earnedAt: now,
        source: `hours_read_${milestone}`,
      });
    }
  }

  return { boxes, milestones };
}

/**
 * Get all pool companions that are available for loot box pulls
 * (have generated images and haven't been unlocked)
 * Only includes companions from books that are being read or finished,
 * not from books in the "to read" queue.
 */
export function getPoolCompanions(books: Book[]): Companion[] {
  const pool: Companion[] = [];

  for (const book of books) {
    if (!book.companions) continue;
    // Skip books that haven't been started yet
    if (book.status === 'to_read') continue;

    for (const companion of book.companions.poolQueue.companions) {
      // Only include if:
      // - Has a generated image
      // - Hasn't been unlocked yet
      if (companion.imageUrl && companion.unlockMethod === null) {
        pool.push(companion);
      }
    }
  }

  return pool;
}

/**
 * Open a loot box and get a random companion from the pool
 * Weighted toward companions from the current book
 */
export function openLootBox(
  pool: Companion[],
  currentBookId: string | null
): { companion: Companion | null } {
  if (pool.length === 0) {
    return { companion: null };
  }

  // Build weighted pool
  const weightedPool: Companion[] = [];
  for (const companion of pool) {
    const weight =
      currentBookId && companion.bookId === currentBookId
        ? CURRENT_BOOK_WEIGHT
        : 1;
    for (let i = 0; i < weight; i++) {
      weightedPool.push(companion);
    }
  }

  // Random selection
  const index = Math.floor(Math.random() * weightedPool.length);
  const selected = weightedPool[index];

  // Mark as unlocked
  const unlocked: Companion = {
    ...selected,
    unlockMethod: 'loot_box',
    unlockedAt: Date.now(),
  };

  return { companion: unlocked };
}

/**
 * Rarity fallback order - if target rarity unavailable, try lower rarities
 */
const RARITY_FALLBACK: Record<CompanionRarity, CompanionRarity[]> = {
  legendary: ['legendary', 'rare', 'common'],
  rare: ['rare', 'common'],
  common: ['common'],
};

/**
 * Open a loot box with rarity-aware selection.
 * Prioritizes companions of the target rarity, with fallback to lower rarities.
 * Still weighted toward companions from the current book.
 */
export function openLootBoxWithRarity(
  pool: Companion[],
  currentBookId: string | null,
  targetRarity: CompanionRarity
): { companion: Companion | null; actualRarity: CompanionRarity | null } {
  if (pool.length === 0) {
    return { companion: null, actualRarity: null };
  }

  // Try each rarity in fallback order
  const fallbackOrder = RARITY_FALLBACK[targetRarity];
  let filteredPool: Companion[] = [];
  let actualRarity: CompanionRarity | null = null;

  for (const rarity of fallbackOrder) {
    filteredPool = pool.filter(c => c.rarity === rarity);
    if (filteredPool.length > 0) {
      actualRarity = rarity;
      break;
    }
  }

  // If no companions match any rarity (shouldn't happen), use full pool
  if (filteredPool.length === 0) {
    filteredPool = pool;
    actualRarity = pool[0]?.rarity ?? null;
  }

  // Build weighted pool from filtered companions
  const weightedPool: Companion[] = [];
  for (const companion of filteredPool) {
    const weight =
      currentBookId && companion.bookId === currentBookId
        ? CURRENT_BOOK_WEIGHT
        : 1;
    for (let i = 0; i < weight; i++) {
      weightedPool.push(companion);
    }
  }

  // Random selection
  const index = Math.floor(Math.random() * weightedPool.length);
  const selected = weightedPool[index];

  // Mark as unlocked
  const unlocked: Companion = {
    ...selected,
    unlockMethod: 'loot_box',
    unlockedAt: Date.now(),
  };

  return { companion: unlocked, actualRarity };
}
