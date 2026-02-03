import { LootBoxTier, CompanionRarity, Companion } from './types';
import { ConsumableTier, ConsumableDefinition, getConsumablesByTier } from './consumables';

// Unified bonus drop system
// When reading, checkpoint drops can be consumables, loot boxes, or companions directly

export type BonusDropResult =
  | { type: 'consumable'; tier: ConsumableTier; consumable: ConsumableDefinition }
  | { type: 'lootbox'; tier: LootBoxTier }
  | { type: 'companion'; rarity: CompanionRarity };

// Drop weights - higher = more common
// Total: 120, roughly:
// - 64% consumable (77/120)
// - 28% loot box (34/120)
// - 8% companion (9/120)
export const BONUS_DROP_WEIGHTS = {
  consumable_weak: 40,
  consumable_medium: 25,
  lootbox_wood: 20,
  consumable_strong: 12,
  lootbox_silver: 10,
  companion_common: 6,
  lootbox_gold: 4,
  companion_rare: 2,
  companion_legendary: 1,
} as const;

type BonusDropKey = keyof typeof BONUS_DROP_WEIGHTS;

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
 * Available companion rarities in the current book's pool.
 * Used to exclude unavailable rarities from the drop table.
 */
export interface AvailableRarities {
  common: boolean;
  rare: boolean;
  legendary: boolean;
}

/**
 * Roll for what type of bonus drop occurs using the unified drop table.
 * Returns the drop type and specifics (tier/rarity).
 *
 * @param availableRarities - Which companion rarities are available in the pool.
 *                            Unavailable rarities have their weight redistributed.
 */
export function rollBonusDropType(availableRarities?: AvailableRarities): BonusDropResult {
  // Build adjusted weights based on available rarities
  const adjustedWeights: Record<BonusDropKey, number> = { ...BONUS_DROP_WEIGHTS };

  // If rarities info provided, zero out unavailable companion rarities
  if (availableRarities) {
    let removedWeight = 0;

    if (!availableRarities.common) {
      removedWeight += adjustedWeights.companion_common;
      adjustedWeights.companion_common = 0;
    }
    if (!availableRarities.rare) {
      removedWeight += adjustedWeights.companion_rare;
      adjustedWeights.companion_rare = 0;
    }
    if (!availableRarities.legendary) {
      removedWeight += adjustedWeights.companion_legendary;
      adjustedWeights.companion_legendary = 0;
    }

    // Redistribute removed weight proportionally to non-companion drops
    if (removedWeight > 0) {
      const nonCompanionKeys: BonusDropKey[] = [
        'consumable_weak', 'consumable_medium', 'consumable_strong',
        'lootbox_wood', 'lootbox_silver', 'lootbox_gold',
      ];
      const nonCompanionTotal = nonCompanionKeys.reduce((sum, key) => sum + adjustedWeights[key], 0);

      for (const key of nonCompanionKeys) {
        const proportion = adjustedWeights[key] / nonCompanionTotal;
        adjustedWeights[key] += removedWeight * proportion;
      }
    }
  }

  const entries = Object.entries(adjustedWeights) as [BonusDropKey, number][];
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);

  let random = Math.random() * totalWeight;

  let selectedKey: BonusDropKey = 'consumable_weak'; // default fallback
  for (const [key, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      selectedKey = key;
      break;
    }
  }

  // Parse the selected key into a drop result
  if (selectedKey.startsWith('consumable_')) {
    const tier = selectedKey.replace('consumable_', '') as ConsumableTier;
    const consumables = getConsumablesByTier(tier);
    const consumable = consumables[Math.floor(Math.random() * consumables.length)];
    return { type: 'consumable', tier, consumable };
  } else if (selectedKey.startsWith('lootbox_')) {
    const tier = selectedKey.replace('lootbox_', '') as LootBoxTier;
    return { type: 'lootbox', tier };
  } else {
    // companion_*
    const rarity = selectedKey.replace('companion_', '') as CompanionRarity;
    return { type: 'companion', rarity };
  }
}

/**
 * Roll for bonus drops at checkpoints during a session.
 * Returns array of actual drop results (consumables, loot boxes, or companion rarities).
 *
 * @param sessionMinutes - Duration of the reading session in minutes
 * @param dropRateBoost - Value between 0 and 1, added to base chance
 * @param availableRarities - Which companion rarities are available in the pool
 * @returns Array of bonus drop results
 */
export function rollCheckpointDrops(
  sessionMinutes: number,
  dropRateBoost: number,
  availableRarities?: AvailableRarities
): BonusDropResult[] {
  // Enforce minimum session length
  if (sessionMinutes < MINIMUM_SESSION_MINUTES) {
    return [];
  }

  // Calculate drop chance (base + boost, but boost can't go negative)
  const effectiveBoost = Math.max(0, dropRateBoost);
  const dropChance = BASE_CHECKPOINT_DROP_CHANCE + effectiveBoost;

  // Full checkpoints
  const fullCheckpoints = Math.floor(sessionMinutes / CHECKPOINT_INTERVAL_MINUTES);

  // Partial checkpoint (remaining minutes)
  const remainingMinutes = sessionMinutes % CHECKPOINT_INTERVAL_MINUTES;
  const partialMultiplier = remainingMinutes / CHECKPOINT_INTERVAL_MINUTES;

  const drops: BonusDropResult[] = [];

  // Roll full checkpoints
  for (let i = 0; i < fullCheckpoints; i++) {
    if (Math.random() < dropChance) {
      drops.push(rollBonusDropType(availableRarities));
    }
  }

  // Roll partial checkpoint
  if (partialMultiplier > 0) {
    if (Math.random() < dropChance * partialMultiplier) {
      drops.push(rollBonusDropType(availableRarities));
    }
  }

  return drops;
}

/** @deprecated Use rollCheckpointDrops instead */
export function rollBonusDrop(dropRateBoost: number): boolean {
  if (dropRateBoost <= 0) return false;
  return Math.random() < dropRateBoost;
}

/**
 * Complete loot roll using the three-layer system.
 * 1. Roll box tier (with luck boost)
 * 2. Roll category
 * 3. Roll specific item (consumable or companion rarity)
 *
 * NOTE: Use rollLootForTier() when opening a box with a known tier.
 * This function is for earning NEW boxes where the tier needs to be determined.
 */
export function rollLoot(luckBoost: number = 0): LootResult {
  // Layer 1: Box tier
  const boxTier = rollBoxTier(luckBoost);

  return rollLootForTier(boxTier);
}

export interface RollLootOptions {
  /** If false, forces consumable instead of companion (for empty pools) */
  companionPoolAvailable?: boolean;
}

/**
 * Roll loot contents for a box with a known tier.
 * Use this when opening a box that already has a tier assigned.
 *
 * @param boxTier - The tier of the box being opened
 * @param options - Optional settings like pool availability
 */
export function rollLootForTier(boxTier: LootBoxTier, options?: RollLootOptions): LootResult {
  const companionPoolAvailable = options?.companionPoolAvailable ?? true;

  // Layer 2: Category (force consumable if no companions available)
  let category = rollCategory(boxTier);
  if (category === 'companion' && !companionPoolAvailable) {
    category = 'consumable';
  }

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

// Pity system constants
export const PITY_BONUS_PER_MISS = 0.03; // +3% gold chance per non-gold box
export const PITY_HARD_CAP = 25; // Guaranteed gold after 25 non-gold boxes

// Checkpoint drop constants
export const BASE_CHECKPOINT_DROP_CHANCE = 0.01; // 1% base chance per checkpoint
export const CHECKPOINT_INTERVAL_MINUTES = 10;   // Roll every 10 minutes
export const MINIMUM_SESSION_MINUTES = 5;        // Must read at least 5 min

export interface PityState {
  goldPityCounter: number;
}

export interface TierRollResult {
  tier: LootBoxTier;
  newPityCounter: number;
}

/**
 * Roll for box tier using layered luck system with pity.
 *
 * Layer 1: luck reduces wood chance
 * Layer 2: rare_luck and legendary_luck distribute non-wood between silver/gold
 * Pity: +3% gold per miss, guaranteed at 25
 */
export function rollBoxTierWithPity(
  luck: number,
  rareLuck: number,
  legendaryLuck: number,
  pityState: PityState
): TierRollResult {
  // Hard cap: guaranteed gold at 25 misses
  if (pityState.goldPityCounter >= PITY_HARD_CAP) {
    return { tier: 'gold', newPityCounter: 0 };
  }

  // Clamp inputs
  const clampedLuck = Math.max(0, Math.min(1, luck));
  const clampedLegendaryLuck = Math.max(0, Math.min(1, legendaryLuck));

  // Calculate pity bonus
  const pityBonus = pityState.goldPityCounter * PITY_BONUS_PER_MISS;

  // Layer 1: Wood vs non-wood
  const woodChance = BOX_TIER_ODDS.wood * (1 - clampedLuck);
  const nonWoodChance = 1 - woodChance;

  // Layer 2: Distribute non-wood between silver and gold
  // Base ratio: 25:5 = 83.3% silver, 16.7% gold
  const baseGoldShare = BOX_TIER_ODDS.gold / (BOX_TIER_ODDS.silver + BOX_TIER_ODDS.gold);

  // legendary_luck triples gold's share per point
  let goldShare = baseGoldShare * (1 + clampedLegendaryLuck * 3) + pityBonus;
  goldShare = Math.min(goldShare, 1); // Cap at 100%

  const silverShare = 1 - goldShare;

  // Calculate final probabilities
  const goldChance = nonWoodChance * goldShare;
  const silverChance = nonWoodChance * silverShare;

  // Roll
  const roll = Math.random();

  let tier: LootBoxTier;
  if (roll < goldChance) {
    tier = 'gold';
  } else if (roll < goldChance + silverChance) {
    tier = 'silver';
  } else {
    tier = 'wood';
  }

  // Update pity counter
  const newPityCounter = tier === 'gold' ? 0 : pityState.goldPityCounter + 1;

  return { tier, newPityCounter };
}
