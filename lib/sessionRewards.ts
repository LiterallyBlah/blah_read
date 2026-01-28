/**
 * Session Reward Processor
 *
 * Main integration point for the V3 reward system. Processes session end
 * and calculates all rewards: book levels, XP, genre levels, loot boxes.
 */

import { Book, UserProgress, Companion, LootBoxV3, LootBoxTier, GenreLevels } from './types';
import { Genre, GENRES } from './genres';
import { processReadingTime, calculateCompletionBonus } from './bookLeveling';
import { calculateActiveEffects, ActiveEffects } from './companionEffects';
import { getActiveEffects as getConsumableEffects, tickConsumables } from './consumableManager';
import { rollBoxTier, rollBonusDrop } from './lootV3';
import { getStreakMultiplier } from './xp';

// Constants
export const BASE_XP_PER_MINUTE = 10;

/**
 * Result of processing a session end.
 */
export interface SessionRewardResult {
  bookLevelsGained: number;
  newBookLevel: number;
  xpGained: number;
  genreLevelIncreases: Record<Genre, number>;
  lootBoxes: LootBoxV3[];
  bonusDropTriggered: boolean;
  activeEffects: ActiveEffects;
  updatedBook: Book;
  updatedProgress: UserProgress;
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
  totalLuckBoost: number;
  totalDropRateBoost: number;
  combinedActiveEffects: ActiveEffects;
} {
  const totalXpBoost = companionEffects.xpBoost + consumableEffects.xpBoost;
  const totalLuckBoost = companionEffects.luckBoost + consumableEffects.luckBoost;
  const totalDropRateBoost = companionEffects.dropRateBoost + consumableEffects.dropRateBoost;

  const combinedActiveEffects: ActiveEffects = {
    xpBoost: companionEffects.xpBoost + consumableEffects.xpBoost,
    luckBoost: companionEffects.luckBoost + consumableEffects.luckBoost,
    dropRateBoost: companionEffects.dropRateBoost + consumableEffects.dropRateBoost,
    completionBonus: companionEffects.completionBonus,
  };

  return {
    totalXpBoost,
    totalLuckBoost,
    totalDropRateBoost,
    combinedActiveEffects,
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

  const bookGenres = book.normalizedGenres || [];

  // Step 1: Calculate companion effects
  const companionEffects = calculateActiveEffects(equippedCompanions, bookGenres);

  // Step 2: Calculate consumable effects
  const activeConsumables = progress.activeConsumables || [];
  const consumableEffects = getConsumableEffects(activeConsumables);

  // Step 3: Combine boosts
  const { totalXpBoost, totalLuckBoost, totalDropRateBoost, combinedActiveEffects } =
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
  const minutes = validSessionSeconds / 60;
  const streakMultiplier = getStreakMultiplier(progress.currentStreak);
  const baseXp = Math.round(minutes * BASE_XP_PER_MINUTE * streakMultiplier);
  const xpGained = Math.round(baseXp * (1 + totalXpBoost));

  // Step 7: Calculate genre level increases (distribute evenly across genres)
  const genreLevelIncreases = createEmptyGenreLevelIncreases();

  if (bookGenres.length > 0 && levelsGained > 0) {
    const basePerGenre = Math.floor(levelsGained / bookGenres.length);
    let remainder = levelsGained % bookGenres.length;

    for (const genre of bookGenres) {
      genreLevelIncreases[genre] = basePerGenre;
      if (remainder > 0) {
        genreLevelIncreases[genre]++;
        remainder--;
      }
    }
  }

  // Step 8: Roll loot boxes (1 per level, use luck boost for tier)
  const lootBoxes: LootBoxV3[] = [];

  // Level up boxes
  const regularLevelsGained = levelResult.levelsGained;
  for (let i = 0; i < regularLevelsGained; i++) {
    const tier = rollBoxTier(totalLuckBoost);
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
    const tier = rollBoxTier(totalLuckBoost);
    lootBoxes.push({
      id: generateLootBoxId(),
      tier,
      earnedAt: now,
      source: 'completion',
      bookId: book.id,
    });
  }

  // Step 9: Check bonus drop (rollBonusDrop with drop rate boost)
  const bonusDropTriggered = rollBonusDrop(totalDropRateBoost);
  if (bonusDropTriggered) {
    const bonusTier = rollBoxTier(totalLuckBoost);
    lootBoxes.push({
      id: generateLootBoxId(),
      tier: bonusTier,
      earnedAt: now,
      source: 'bonus_drop',
      bookId: book.id,
    });
  }

  // Step 10: Update book progression
  const newTotalSeconds = currentProgression.totalSeconds + validSessionSeconds;
  const newLevelUps = [...currentProgression.levelUps];

  // Record timestamps for level ups
  for (let i = 0; i < levelsGained; i++) {
    newLevelUps.push(now);
  }

  const updatedBook: Book = {
    ...book,
    totalReadingTime: book.totalReadingTime + validSessionSeconds,
    progression: {
      level: newLevel,
      totalSeconds: newTotalSeconds,
      levelUps: newLevelUps,
    },
  };

  // Step 11: Update user progress
  const updatedGenreLevels: GenreLevels = { ...(progress.genreLevels || createEmptyGenreLevelIncreases()) };
  for (const genre of bookGenres) {
    updatedGenreLevels[genre] = (updatedGenreLevels[genre] || 0) + genreLevelIncreases[genre];
  }

  // Step 11b: Tick consumables (pass session minutes)
  const sessionMinutes = Math.floor(validSessionSeconds / 60);
  const tickedConsumables = tickConsumables(activeConsumables, sessionMinutes);

  const existingLootBoxesV3 = progress.lootBoxesV3 || [];

  const updatedProgress: UserProgress = {
    ...progress,
    totalXp: progress.totalXp + xpGained,
    genreLevels: updatedGenreLevels,
    lootBoxesV3: [...existingLootBoxesV3, ...lootBoxes],
    activeConsumables: tickedConsumables,
  };

  return {
    bookLevelsGained: levelsGained,
    newBookLevel: newLevel,
    xpGained,
    genreLevelIncreases,
    lootBoxes,
    bonusDropTriggered,
    activeEffects: combinedActiveEffects,
    updatedBook,
    updatedProgress,
  };
}
