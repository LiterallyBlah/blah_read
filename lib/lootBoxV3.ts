import { LootBoxV3, LootBoxTier, UserProgress, Companion, Genre } from './shared';
import { calculateActiveEffects } from './companion';
import { getActiveEffects as getConsumableEffects } from './consumables';
import { rollBoxTierWithPity, rollLootForTier, LootResult, rollCompanionRarity } from './lootV3';

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
 * Upgrade a box tier by one level.
 */
function upgradeTier(tier: LootBoxTier): LootBoxTier {
  switch (tier) {
    case 'wood': return 'silver';
    case 'silver': return 'gold';
    case 'gold': return 'gold';
  }
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

  // Apply box upgrade if pending
  let consumedBoxUpgrade = false;
  if (progress.pendingBoxUpgrade) {
    rolledTier = upgradeTier(rolledTier);
    consumedBoxUpgrade = true;
  }

  // Roll loot contents
  let lootResult: LootResult;
  let consumedGuaranteedCompanion = false;

  if (progress.pendingGuaranteedCompanion && companionPoolAvailable) {
    // Force companion drop
    const companionRarity = rollCompanionRarity(rolledTier);
    lootResult = {
      boxTier: rolledTier,
      category: 'companion',
      companionRarity,
    };
    consumedGuaranteedCompanion = true;
  } else {
    // Normal roll (force consumable if pool empty)
    lootResult = rollLootForTier(rolledTier, { companionPoolAvailable });
  }

  // Create updated progress with new pity counter and consumed flags
  const updatedProgress: UserProgress = {
    ...progress,
    goldPityCounter: newPityCounter,
    pendingBoxUpgrade: consumedBoxUpgrade ? false : progress.pendingBoxUpgrade,
    pendingGuaranteedCompanion: consumedGuaranteedCompanion ? false : progress.pendingGuaranteedCompanion,
  };

  return {
    rolledTier,
    lootResult,
    updatedProgress,
  };
}
