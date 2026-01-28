import { LootBoxV3, LootBoxTier, UserProgress, Companion } from './types';
import { Genre } from './genres';
import { calculateActiveEffects } from './companionEffects';
import { getActiveEffects as getConsumableEffects } from './consumableManager';
import { rollBoxTierWithPity, rollLootForTier, LootResult } from './lootV3';

export interface OpenLootBoxResult {
  rolledTier: LootBoxTier;
  lootResult: LootResult;
  updatedProgress: UserProgress;
}

export interface OpenLootBoxOptions {
  /** Number of companions available in the pool (0 = force consumable) */
  companionPoolSize?: number;
}

/**
 * Open a V3 loot box, rolling tier at open time if blank.
 * Applies luck stats and pity system.
 *
 * @param options.companionPoolSize - Pass 0 to force consumable drops when pool is empty
 */
export function openLootBoxV3(
  box: LootBoxV3,
  progress: UserProgress,
  equippedCompanions: Companion[],
  bookGenres: Genre[],
  options?: OpenLootBoxOptions
): OpenLootBoxResult {
  const companionPoolAvailable = (options?.companionPoolSize ?? 1) > 0;
  let rolledTier: LootBoxTier;
  let newPityCounter: number;

  // Check if this is a legacy box with pre-determined tier
  if (box.tier !== undefined) {
    // Legacy box: use existing tier
    rolledTier = box.tier;

    // Still update pity based on result for consistency
    if (rolledTier === 'gold') {
      newPityCounter = 0;
    } else {
      newPityCounter = (progress.goldPityCounter ?? 0) + 1;
    }
  } else {
    // Blank box: roll tier at open time
    const companionEffects = calculateActiveEffects(equippedCompanions, bookGenres);
    const consumableEffects = getConsumableEffects(progress.activeConsumables ?? []);

    const totalLuck = companionEffects.luck + consumableEffects.luck;
    const totalRareLuck = companionEffects.rareLuck + consumableEffects.rareLuck;
    const totalLegendaryLuck = companionEffects.legendaryLuck + consumableEffects.legendaryLuck;

    const tierResult = rollBoxTierWithPity(
      totalLuck,
      totalRareLuck,
      totalLegendaryLuck,
      { goldPityCounter: progress.goldPityCounter ?? 0 }
    );

    rolledTier = tierResult.tier;
    newPityCounter = tierResult.newPityCounter;
  }

  // Roll loot contents based on tier (force consumable if pool empty)
  const lootResult = rollLootForTier(rolledTier, { companionPoolAvailable });

  // Create updated progress with new pity counter
  const updatedProgress: UserProgress = {
    ...progress,
    goldPityCounter: newPityCounter,
  };

  return {
    rolledTier,
    lootResult,
    updatedProgress,
  };
}
