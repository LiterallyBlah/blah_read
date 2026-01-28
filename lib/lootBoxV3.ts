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

/**
 * Open a V3 loot box, rolling tier at open time if blank.
 * Applies luck stats and pity system.
 */
export function openLootBoxV3(
  box: LootBoxV3,
  progress: UserProgress,
  equippedCompanions: Companion[],
  bookGenres: Genre[]
): OpenLootBoxResult {
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

  // Roll loot contents based on tier
  const lootResult = rollLootForTier(rolledTier);

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
