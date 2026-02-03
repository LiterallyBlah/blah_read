// lib/companionEffects.ts
import { CompanionRarity, Companion } from './types';
import { Genre } from './genres';

export const EFFECT_TYPES = [
  'xp_boost',
  'luck',           // was luck_boost - reduces wood chance
  'rare_luck',      // NEW - increases silver share of non-wood
  'legendary_luck', // NEW - increases gold share of non-wood
  'drop_rate_boost',
  'completion_bonus',
] as const;

export type EffectType = typeof EFFECT_TYPES[number];

export interface CompanionEffect {
  type: EffectType;
  magnitude: number; // 0.05 = 5%, 0.30 = 30%
  targetGenre?: Genre; // undefined = global
}

const EFFECT_MAGNITUDES: Record<CompanionRarity, { min: number; max: number }> = {
  common: { min: 0.03, max: 0.07 },
  rare: { min: 0.12, max: 0.18 },
  legendary: { min: 0.25, max: 0.35 },
};

const GENRE_LEVEL_REQUIREMENTS: Record<CompanionRarity, number> = {
  common: 0,
  rare: 10,
  legendary: 20,
};

export const BOOK_LEVEL_REQUIREMENTS: Record<CompanionRarity, number> = {
  common: 0,
  rare: 5,
  legendary: 10,
};

// Probability of getting effects based on rarity
// Second effect only rolls if first effect was granted
const EFFECT_CHANCES: Record<CompanionRarity, { first: number; second: number }> = {
  common: { first: 0.25, second: 0.05 },    // 25% for 1st, 5% for 2nd
  rare: { first: 1.0, second: 0.20 },       // 100% for 1st, 20% for 2nd
  legendary: { first: 1.0, second: 0.50 },  // 100% for 1st, 50% for 2nd
};

// Chance that xp_boost targets a specific genre vs being global
const XP_BOOST_GENRE_TARGET_CHANCE = 0.5;

export interface EquipRequirements {
  canEquip: boolean;
  missingGenreLevel?: number;
  missingBookLevel?: number;
  requiredGenreLevel: number;
  requiredBookLevel: number;
}

export function canEquipCompanion(
  rarity: CompanionRarity,
  targetGenre: Genre | undefined,
  currentGenreLevel: number,
  currentBookLevel: number
): EquipRequirements {
  const requiredGenreLevel = GENRE_LEVEL_REQUIREMENTS[rarity];
  const requiredBookLevel = BOOK_LEVEL_REQUIREMENTS[rarity];

  let missingGenreLevel: number | undefined;
  let missingBookLevel: number | undefined;

  // For genre-targeted companions, check genre level requirement
  if (targetGenre !== undefined && currentGenreLevel < requiredGenreLevel) {
    missingGenreLevel = requiredGenreLevel - currentGenreLevel;
  }

  // Always check book level requirement
  if (currentBookLevel < requiredBookLevel) {
    missingBookLevel = requiredBookLevel - currentBookLevel;
  }

  const canEquip = missingGenreLevel === undefined && missingBookLevel === undefined;

  return {
    canEquip,
    missingGenreLevel,
    missingBookLevel,
    requiredGenreLevel,
    requiredBookLevel,
  };
}

export function calculateEffectMagnitude(rarity: CompanionRarity): number {
  const range = EFFECT_MAGNITUDES[rarity];
  return range.min + Math.random() * (range.max - range.min);
}

const LUCK_TYPES = ['luck', 'rare_luck', 'legendary_luck'] as const;
type LuckType = typeof LUCK_TYPES[number];

const LUCK_AVAILABILITY: Record<CompanionRarity, LuckType[]> = {
  common: ['luck'],
  rare: ['luck', 'rare_luck'],
  legendary: ['luck', 'rare_luck', 'legendary_luck'],
};

export function getAvailableLuckTypes(rarity: CompanionRarity): LuckType[] {
  return LUCK_AVAILABILITY[rarity];
}

// Completion bonus is legendary-only
export function getAvailableEffectTypes(rarity: CompanionRarity): EffectType[] {
  if (rarity === 'legendary') {
    return [...EFFECT_TYPES];
  }
  return EFFECT_TYPES.filter(t => t !== 'completion_bonus');
}

/**
 * Roll a single effect, excluding specified types
 */
function rollSingleEffect(
  rarity: CompanionRarity,
  bookGenres: Genre[] | undefined,
  excludeTypes: EffectType[]
): CompanionEffect {
  const availableTypes = getAvailableEffectTypes(rarity)
    .filter(t => !excludeTypes.includes(t));

  const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
  const magnitude = calculateEffectMagnitude(rarity);

  // For xp_boost, optionally target a genre
  let targetGenre: Genre | undefined;
  if (type === 'xp_boost' && bookGenres && bookGenres.length > 0) {
    if (Math.random() < XP_BOOST_GENRE_TARGET_CHANCE) {
      targetGenre = bookGenres[Math.floor(Math.random() * bookGenres.length)];
    }
  }

  return { type, magnitude, targetGenre };
}

/**
 * Roll effects for a companion based on rarity probability
 */
export function rollCompanionEffects(
  rarity: CompanionRarity,
  bookGenres?: Genre[]
): CompanionEffect[] {
  const effects: CompanionEffect[] = [];
  const chances = EFFECT_CHANCES[rarity];

  // Roll for first effect
  if (Math.random() < chances.first) {
    effects.push(rollSingleEffect(rarity, bookGenres, []));

    // Roll for second effect (only if first was granted)
    if (Math.random() < chances.second) {
      effects.push(rollSingleEffect(rarity, bookGenres, [effects[0].type]));
    }
  }

  return effects;
}

/**
 * Re-roll effects for an existing companion
 * Returns new effects array (does not mutate the companion)
 */
export function rerollCompanionEffects(
  companion: Companion,
  bookGenres?: Genre[]
): CompanionEffect[] {
  return rollCompanionEffects(companion.rarity, bookGenres);
}

export interface ActiveEffects {
  xpBoost: number;
  luck: number;           // was luckBoost - reduces wood chance
  rareLuck: number;       // NEW - increases silver share
  legendaryLuck: number;  // NEW - increases gold share
  dropRateBoost: number;
  completionBonus: number;
}

export function calculateActiveEffects(
  equippedCompanions: Companion[],
  bookGenres: Genre[]
): ActiveEffects {
  const effects: ActiveEffects = {
    xpBoost: 0,
    luck: 0,
    rareLuck: 0,
    legendaryLuck: 0,
    dropRateBoost: 0,
    completionBonus: 0,
  };

  for (const companion of equippedCompanions) {
    // Handle companions with no effects (effects undefined/null)
    if (!companion.effects) {
      continue;
    }

    for (const effect of companion.effects) {
      // Check if effect applies
      // If effect has no targetGenre, it applies (global effect)
      // If effect has targetGenre, only apply if bookGenres includes it
      const applies = !effect.targetGenre || bookGenres.includes(effect.targetGenre);

      if (!applies) {
        continue;
      }

      // Sum effect by type
      switch (effect.type) {
        case 'xp_boost':
          effects.xpBoost += effect.magnitude;
          break;
        case 'luck':
          effects.luck += effect.magnitude;
          break;
        case 'rare_luck':
          effects.rareLuck += effect.magnitude;
          break;
        case 'legendary_luck':
          effects.legendaryLuck += effect.magnitude;
          break;
        case 'drop_rate_boost':
          effects.dropRateBoost += effect.magnitude;
          break;
        case 'completion_bonus':
          effects.completionBonus += effect.magnitude;
          break;
      }
    }
  }

  return effects;
}

/**
 * Backfill effects for all companions based on rarity probability.
 * Returns a map of companionId -> new effects array.
 * Pass bookGenresMap to enable genre-targeted xp_boost effects.
 */
export function backfillAllCompanionEffects(
  companions: Companion[],
  bookGenresMap?: Map<string, Genre[]>
): Map<string, CompanionEffect[] | undefined> {
  const result = new Map<string, CompanionEffect[] | undefined>();

  for (const companion of companions) {
    const bookGenres = bookGenresMap?.get(companion.bookId);
    const effects = rollCompanionEffects(companion.rarity, bookGenres);
    result.set(companion.id, effects.length > 0 ? effects : undefined);
  }

  return result;
}
