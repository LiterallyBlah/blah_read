/**
 * Session Reward Processor
 *
 * Main integration point for the V3 reward system. Processes session end
 * and calculates all rewards: book levels, XP, genre levels, loot boxes.
 */

import { Book, UserProgress, Companion, LootBoxV3, GenreLevels, CompanionRarity, ActiveConsumable, SlotUnlockProgress, Genre, GENRES } from './shared';
import { processReadingTime, calculateCompletionBonus } from './books';
import { calculateActiveEffects, ActiveEffects } from './companion';
import { getActiveEffects as getConsumableEffects, tickConsumables, consolidateActiveConsumables } from './consumables';
import { rollCheckpointDrops, rollBoxTierWithPity, BonusDropResult, AvailableRarities } from './lootV3';
import { ConsumableDefinition } from './consumables';
import { getStreakMultiplier, calculateLevel } from './xp';

// Constants
export const BASE_XP_PER_MINUTE = 10;

/**
 * A processed bonus drop with the actual item.
 */
export interface ProcessedBonusDrop {
  type: 'consumable' | 'lootbox' | 'companion';
  consumable?: ConsumableDefinition;
  lootBoxTier?: 'wood' | 'silver' | 'gold';
  companion?: Companion;
  // For display: what was originally rolled (before fallback)
  originalRarity?: CompanionRarity;
  wasFallback?: boolean;
}

/**
 * Result of processing a session end.
 */
export interface SessionRewardResult {
  bookLevelsGained: number;
  newBookLevel: number;
  xpGained: number;
  genreLevelIncreases: Record<Genre, number>;
  lootBoxes: LootBoxV3[];
  bonusDrops: ProcessedBonusDrop[];
  activeEffects: ActiveEffects;
  updatedBook: Book;
  updatedProgress: UserProgress;
  // New fields for results screen
  previousBookLevel: number;
  previousPlayerLevel: number;
  previousGenreLevels: Record<Genre, number>;
  baseXpBeforeBoosts: number;
  streakMultiplier: number;
}

/**
 * Generate a unique ID for a loot box.
 */
function generateLootBoxId(): string {
  return `lootbox-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create initial genre level increases with all genres set to 0.
 */
function createEmptyGenreLevelIncreases(): Record<Genre, number> {
  const increases: Record<Genre, number> = {} as Record<Genre, number>;
  for (const genre of GENRES) {
    increases[genre] = 0;
  }
  return increases;
}

/**
 * Combine companion effects and consumable effects into total boosts.
 */
function combineEffects(
  companionEffects: ActiveEffects,
  consumableEffects: ReturnType<typeof getConsumableEffects>
): {
  totalXpBoost: number;
  totalLuck: number;
  totalRareLuck: number;
  totalLegendaryLuck: number;
  totalDropRateBoost: number;
  combinedActiveEffects: ActiveEffects;
} {
  const totalXpBoost = companionEffects.xpBoost + consumableEffects.xpBoost;
  const totalLuck = companionEffects.luck + consumableEffects.luck;
  const totalRareLuck = companionEffects.rareLuck + consumableEffects.rareLuck;
  const totalLegendaryLuck = companionEffects.legendaryLuck + consumableEffects.legendaryLuck;
  const totalDropRateBoost = companionEffects.dropRateBoost + consumableEffects.dropRateBoost;

  const combinedActiveEffects: ActiveEffects = {
    xpBoost: companionEffects.xpBoost + consumableEffects.xpBoost,
    luck: companionEffects.luck + consumableEffects.luck,
    rareLuck: companionEffects.rareLuck + consumableEffects.rareLuck,
    legendaryLuck: companionEffects.legendaryLuck + consumableEffects.legendaryLuck,
    dropRateBoost: companionEffects.dropRateBoost + consumableEffects.dropRateBoost,
    completionBonus: companionEffects.completionBonus,
  };

  return {
    totalXpBoost,
    totalLuck,
    totalRareLuck,
    totalLegendaryLuck,
    totalDropRateBoost,
    combinedActiveEffects,
  };
}

/**
 * Try to pull a companion of specific rarity from a book's pool queue.
 * Returns the companion if available, null otherwise.
 * Does NOT modify the book - caller must handle moving companion to unlocked.
 */
function pullCompanionFromBookPool(book: Book, rarity: CompanionRarity): Companion | null {
  if (!book.companions?.poolQueue?.companions) {
    return null;
  }

  const pool = book.companions.poolQueue.companions;
  const index = pool.findIndex(c => c.rarity === rarity && !c.unlockedAt);

  if (index === -1) {
    return null;
  }

  // Return the companion (actual removal happens when updating book)
  return pool[index];
}

/**
 * Calculate which companion rarities are available in a book's pool.
 * Used to adjust drop table weights so we don't roll for unavailable rarities.
 */
function getAvailableRarities(book: Book): AvailableRarities {
  const pool = book.companions?.poolQueue?.companions || [];
  const unlockedPool = pool.filter(c => !c.unlockedAt);

  return {
    common: unlockedPool.some(c => c.rarity === 'common'),
    rare: unlockedPool.some(c => c.rarity === 'rare'),
    legendary: unlockedPool.some(c => c.rarity === 'legendary'),
  };
}

/**
 * Process the end of a reading session and calculate all rewards.
 *
 * @param book - The book being read
 * @param progress - The user's current progress
 * @param equippedCompanions - List of equipped companions
 * @param sessionSeconds - Duration of the reading session in seconds
 * @param isCompletion - Whether the book was completed
 * @returns SessionRewardResult with all calculated rewards and updates
 */
export function processSessionEnd(
  book: Book,
  progress: UserProgress,
  equippedCompanions: Companion[],
  sessionSeconds: number,
  isCompletion: boolean = false
): SessionRewardResult {
  const now = Date.now();

  // Guard against invalid input
  const validSessionSeconds = Math.max(0, sessionSeconds);

  // Capture previous state BEFORE any calculations
  const previousBookLevel = book.progression?.level ?? 0;
  const previousPlayerLevel = calculateLevel(progress.totalXp);
  const previousGenreLevels = { ...(progress.genreLevels || createEmptyGenreLevelIncreases()) };

  const bookGenres = book.normalizedGenres || [];

  // Step 1: Calculate companion effects
  const companionEffects = calculateActiveEffects(equippedCompanions, bookGenres);

  // Step 2: Calculate consumable effects
  const activeConsumables = progress.activeConsumables || [];
  const consumableEffects = getConsumableEffects(activeConsumables);

  // Step 3: Combine boosts
  const { totalXpBoost, totalLuck, totalDropRateBoost, combinedActiveEffects } =
    combineEffects(companionEffects, consumableEffects);

  // Step 4: Process book leveling
  const currentProgression = book.progression || {
    level: 0,
    totalSeconds: 0,
    levelUps: [],
  };

  const levelResult = processReadingTime(currentProgression.totalSeconds, validSessionSeconds);
  let levelsGained = levelResult.levelsGained;
  let newLevel = levelResult.newLevel;

  // Step 5: Handle completion bonus if isCompletion
  let completionBonusLevels = 0;
  if (isCompletion) {
    // Calculate based on the new total seconds
    const totalSecondsAfterSession = currentProgression.totalSeconds + validSessionSeconds;
    completionBonusLevels = calculateCompletionBonus(totalSecondsAfterSession, book.pageCount ?? null);
    levelsGained += completionBonusLevels;
    newLevel += completionBonusLevels;
  }

  // Step 6: Calculate XP (BASE_XP_PER_MINUTE=10, apply boost and streak)
  // Use Math.floor consistently with lib/xp.ts
  const minutes = validSessionSeconds / 60;
  const streakMultiplier = getStreakMultiplier(progress.currentStreak);
  const baseXpBeforeBoosts = Math.floor(minutes * BASE_XP_PER_MINUTE * streakMultiplier);
  const xpGained = Math.floor(baseXpBeforeBoosts * (1 + totalXpBoost));

  // Step 7: Calculate genre level increases (distribute evenly across genres)
  const genreLevelIncreases = createEmptyGenreLevelIncreases();

  if (bookGenres.length > 0 && levelsGained > 0) {
    const basePerGenre = Math.floor(levelsGained / bookGenres.length);
    const remainder = levelsGained % bookGenres.length;

    // First, give everyone the base amount
    for (const genre of bookGenres) {
      genreLevelIncreases[genre] = basePerGenre;
    }

    // Then randomly distribute the remainder
    // Pick random indices to receive the extra levels
    if (remainder > 0) {
      const shuffledIndices = [...Array(bookGenres.length).keys()];
      // Fisher-Yates shuffle to randomize which genres get remainder
      for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
      }
      // Give extra level to the first 'remainder' genres after shuffle
      for (let i = 0; i < remainder; i++) {
        genreLevelIncreases[bookGenres[shuffledIndices[i]]]++;
      }
    }
  }

  // Step 8: Roll and create loot boxes with tiers
  const lootBoxes: LootBoxV3[] = [];
  let currentPityCounter = progress.goldPityCounter ?? 0;

  // Level up boxes
  const regularLevelsGained = levelResult.levelsGained;
  for (let i = 0; i < regularLevelsGained; i++) {
    const { tier, newPityCounter } = rollBoxTierWithPity(
      totalLuck,
      combinedActiveEffects.rareLuck,
      combinedActiveEffects.legendaryLuck,
      { goldPityCounter: currentPityCounter }
    );
    currentPityCounter = newPityCounter;
    lootBoxes.push({
      id: generateLootBoxId(),
      tier,
      earnedAt: now,
      source: 'level_up',
      bookId: book.id,
    });
  }

  // Completion bonus boxes
  for (let i = 0; i < completionBonusLevels; i++) {
    const { tier, newPityCounter } = rollBoxTierWithPity(
      totalLuck,
      combinedActiveEffects.rareLuck,
      combinedActiveEffects.legendaryLuck,
      { goldPityCounter: currentPityCounter }
    );
    currentPityCounter = newPityCounter;
    lootBoxes.push({
      id: generateLootBoxId(),
      tier,
      earnedAt: now,
      source: 'completion',
      bookId: book.id,
    });
  }

  // Step 9: Roll checkpoint drops (unified drop table)
  const sessionMinutes = Math.floor(validSessionSeconds / 60);
  const availableRarities = getAvailableRarities(book);
  const rawDrops = rollCheckpointDrops(sessionMinutes, totalDropRateBoost, availableRarities);
  const bonusDrops: ProcessedBonusDrop[] = [];
  const droppedConsumables: ActiveConsumable[] = [];
  const droppedCompanions: Companion[] = [];

  for (const drop of rawDrops) {
    if (drop.type === 'consumable') {
      // Direct consumable drop
      bonusDrops.push({
        type: 'consumable',
        consumable: drop.consumable,
      });
      // Add to active consumables
      droppedConsumables.push({
        consumableId: drop.consumable.id,
        appliedAt: now,
        remainingDuration: drop.consumable.duration,
      });
    } else if (drop.type === 'lootbox') {
      // Direct loot box drop
      bonusDrops.push({
        type: 'lootbox',
        lootBoxTier: drop.tier,
      });
      lootBoxes.push({
        id: generateLootBoxId(),
        tier: drop.tier,
        earnedAt: now,
        source: 'bonus_drop',
        bookId: book.id,
      });
    } else if (drop.type === 'companion') {
      // Try to pull companion from current book's pool
      const companion = pullCompanionFromBookPool(book, drop.rarity);
      if (companion) {
        // Mark as unlocked
        companion.unlockMethod = 'loot_box'; // bonus drop counts as loot
        companion.unlockedAt = now;
        bonusDrops.push({
          type: 'companion',
          companion,
          originalRarity: drop.rarity,
        });
        droppedCompanions.push(companion);
      } else {
        // Fallback to loot box of equivalent tier
        const fallbackTier = drop.rarity === 'legendary' ? 'gold' :
                            drop.rarity === 'rare' ? 'silver' : 'wood';
        bonusDrops.push({
          type: 'lootbox',
          lootBoxTier: fallbackTier,
          originalRarity: drop.rarity,
          wasFallback: true,
        });
        lootBoxes.push({
          id: generateLootBoxId(),
          tier: fallbackTier,
          earnedAt: now,
          source: 'bonus_drop',
          bookId: book.id,
        });
      }
    }
  }

  // Step 10: Update book progression and companions
  const newTotalSeconds = currentProgression.totalSeconds + validSessionSeconds;
  const newLevelUps = [...currentProgression.levelUps];

  // Record timestamps for level ups
  for (let i = 0; i < levelsGained; i++) {
    newLevelUps.push(now);
  }

  // Update book companions: move dropped companions from pool to unlocked
  let updatedCompanions = book.companions;
  if (droppedCompanions.length > 0 && book.companions) {
    const droppedIds = new Set(droppedCompanions.map(c => c.id));
    updatedCompanions = {
      ...book.companions,
      poolQueue: {
        ...book.companions.poolQueue,
        companions: book.companions.poolQueue.companions.filter(c => !droppedIds.has(c.id)),
      },
      unlockedCompanions: [...book.companions.unlockedCompanions, ...droppedCompanions],
    };
  }

  const updatedBook: Book = {
    ...book,
    totalReadingTime: book.totalReadingTime + validSessionSeconds,
    progression: {
      level: newLevel,
      totalSeconds: newTotalSeconds,
      levelUps: newLevelUps,
    },
    companions: updatedCompanions,
  };

  // Step 11: Update user progress
  const updatedGenreLevels: GenreLevels = { ...(progress.genreLevels || createEmptyGenreLevelIncreases()) };
  for (const genre of bookGenres) {
    updatedGenreLevels[genre] = (updatedGenreLevels[genre] || 0) + genreLevelIncreases[genre];
  }

  // Step 11b: Tick consumables, add dropped consumables, and consolidate
  const tickedConsumables = tickConsumables(activeConsumables, sessionMinutes);
  const mergedConsumables = [...tickedConsumables, ...droppedConsumables];
  // Consolidate same-type consumables to prevent duplicate entries
  const { consolidated: allConsumables } = consolidateActiveConsumables(mergedConsumables);

  // Step 11c: Update slot progress tracking
  const currentSlotProgress = progress.slotProgress || {
    slot2Points: 0,
    slot3Points: 0,
    booksFinished: 0,
    hoursLogged: 0,
    companionsCollected: 0,
    sessionsCompleted: 0,
    genreLevelTens: [],
    genresRead: [],
  };
  const updatedSlotProgress: SlotUnlockProgress = {
    ...currentSlotProgress,
    genreLevelTens: [...currentSlotProgress.genreLevelTens],
    genresRead: [...currentSlotProgress.genresRead],
  };

  // Always increment sessions completed
  updatedSlotProgress.sessionsCompleted += 1;

  // Track companions collected (count from dropped companions)
  if (droppedCompanions.length > 0) {
    updatedSlotProgress.companionsCollected += droppedCompanions.length;
  }

  // Track unique genres read
  for (const genre of bookGenres) {
    if (!updatedSlotProgress.genresRead.includes(genre)) {
      updatedSlotProgress.genresRead.push(genre);
    }
  }

  // Track genres hitting level 10
  for (const genre of bookGenres) {
    const prevLevel = progress.genreLevels?.[genre] || 0;
    const newLevel = updatedGenreLevels[genre] || 0;
    if (prevLevel < 10 && newLevel >= 10) {
      if (!updatedSlotProgress.genreLevelTens.includes(genre)) {
        updatedSlotProgress.genreLevelTens.push(genre);
      }
    }
  }

  // Track books finished (increment when isCompletion=true)
  let updatedBooksFinished = progress.booksFinished || 0;
  if (isCompletion) {
    updatedBooksFinished += 1;
    updatedSlotProgress.booksFinished += 1;
  }

  const existingLootBoxesV3 = progress.lootBoxesV3 || [];

  const updatedProgress: UserProgress = {
    ...progress,
    totalXp: progress.totalXp + xpGained,
    genreLevels: updatedGenreLevels,
    lootBoxesV3: [...existingLootBoxesV3, ...lootBoxes],
    activeConsumables: allConsumables,
    goldPityCounter: currentPityCounter,
    slotProgress: updatedSlotProgress,
    booksFinished: updatedBooksFinished,
  };

  return {
    bookLevelsGained: levelsGained,
    newBookLevel: newLevel,
    xpGained,
    genreLevelIncreases,
    lootBoxes,
    bonusDrops,
    activeEffects: combinedActiveEffects,
    updatedBook,
    updatedProgress,
    // New fields for results screen
    previousBookLevel,
    previousPlayerLevel,
    previousGenreLevels,
    baseXpBeforeBoosts,
    streakMultiplier,
  };
}
