import { LootBoxTier, CompanionRarity } from './types';
import { ConsumableTier, ConsumableDefinition, getConsumablesByTier } from './consumables';

// Layer 1: Box tier odds (base)
export const BOX_TIER_ODDS: Record<LootBoxTier, number> = {
  wood: 0.70,
  silver: 0.25,
  gold: 0.05,
};

// Layer 2: Category odds by box tier
export const CATEGORY_ODDS: Record<LootBoxTier, { consumable: number; companion: number }> = {
  wood: { consumable: 0.90, companion: 0.10 },
  silver: { consumable: 0.60, companion: 0.40 },
  gold: { consumable: 0.25, companion: 0.75 },
};

// Layer 3a: Consumable tier odds by box tier
export const CONSUMABLE_TIER_ODDS: Record<LootBoxTier, Record<ConsumableTier, number>> = {
  wood: { weak: 0.80, medium: 0.20, strong: 0 },
  silver: { weak: 0.30, medium: 0.60, strong: 0.10 },
  gold: { weak: 0, medium: 0.40, strong: 0.60 },
};

// Layer 3b: Companion rarity odds by box tier
export const COMPANION_RARITY_ODDS: Record<LootBoxTier, Record<CompanionRarity, number>> = {
  wood: { common: 1.0, rare: 0, legendary: 0 },
  silver: { common: 0.60, rare: 0.40, legendary: 0 },
  gold: { common: 0.10, rare: 0.60, legendary: 0.30 },
};

export interface LootResult {
  boxTier: LootBoxTier;
  category: 'consumable' | 'companion';
  consumable?: ConsumableDefinition;
  companionRarity?: CompanionRarity;
}

/**
 * Weighted random selection helper.
 * Takes an object of items and their weights, returns a random item.
 */
function weightedRandom<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);

  let random = Math.random() * totalWeight;

  for (const [item, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return item;
    }
  }

  // Fallback to last item (shouldn't happen with proper weights)
  return entries[entries.length - 1][0];
}

/**
 * Roll for box tier with optional luck boost.
 * Luck boost shifts probability from wood to silver/gold.
 * @param luckBoost - Value between 0 and 1, shifts odds from wood to better tiers
 */
export function rollBoxTier(luckBoost: number = 0): LootBoxTier {
  // Clamp luck boost between 0 and 1
  const boost = Math.max(0, Math.min(1, luckBoost));

  // Calculate shifted odds:
  // - Wood decreases proportionally to luck boost
  // - Silver and gold increase proportionally
  const woodDecrease = BOX_TIER_ODDS.wood * boost;

  // Distribute the decrease to silver and gold based on their relative proportions
  const silverRatio = BOX_TIER_ODDS.silver / (BOX_TIER_ODDS.silver + BOX_TIER_ODDS.gold);
  const goldRatio = BOX_TIER_ODDS.gold / (BOX_TIER_ODDS.silver + BOX_TIER_ODDS.gold);

  const adjustedOdds: Record<LootBoxTier, number> = {
    wood: BOX_TIER_ODDS.wood - woodDecrease,
    silver: BOX_TIER_ODDS.silver + woodDecrease * silverRatio,
    gold: BOX_TIER_ODDS.gold + woodDecrease * goldRatio,
  };

  return weightedRandom(adjustedOdds);
}

/**
 * Roll for category (consumable or companion) based on box tier.
 */
export function rollCategory(boxTier: LootBoxTier): 'consumable' | 'companion' {
  const odds = CATEGORY_ODDS[boxTier];
  return weightedRandom(odds);
}

/**
 * Roll for consumable tier based on box tier.
 */
export function rollConsumableTier(boxTier: LootBoxTier): ConsumableTier {
  const odds = CONSUMABLE_TIER_ODDS[boxTier];
  return weightedRandom(odds);
}

/**
 * Roll for companion rarity based on box tier.
 */
export function rollCompanionRarity(boxTier: LootBoxTier): CompanionRarity {
  const odds = COMPANION_RARITY_ODDS[boxTier];
  return weightedRandom(odds);
}

/**
 * Roll for a specific consumable based on box tier.
 * First determines consumable tier, then picks random consumable of that tier.
 */
export function rollConsumable(boxTier: LootBoxTier): ConsumableDefinition {
  const tier = rollConsumableTier(boxTier);
  const consumables = getConsumablesByTier(tier);

  // Pick random consumable from the tier
  const index = Math.floor(Math.random() * consumables.length);
  return consumables[index];
}

/**
 * Roll for a bonus drop based on drop rate boost.
 * @param dropRateBoost - Value between 0 and 1, chance for bonus drop
 * @returns true if bonus drop should occur
 */
export function rollBonusDrop(dropRateBoost: number): boolean {
  if (dropRateBoost <= 0) return false;
  return Math.random() < dropRateBoost;
}

/**
 * Complete loot roll using the three-layer system.
 * 1. Roll box tier (with luck boost)
 * 2. Roll category
 * 3. Roll specific item (consumable or companion rarity)
 */
export function rollLoot(luckBoost: number = 0): LootResult {
  // Layer 1: Box tier
  const boxTier = rollBoxTier(luckBoost);

  // Layer 2: Category
  const category = rollCategory(boxTier);

  // Layer 3: Specific item
  if (category === 'consumable') {
    const consumable = rollConsumable(boxTier);
    return {
      boxTier,
      category,
      consumable,
    };
  } else {
    const companionRarity = rollCompanionRarity(boxTier);
    return {
      boxTier,
      category,
      companionRarity,
    };
  }
}
