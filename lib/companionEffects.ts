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

const BOOK_LEVEL_REQUIREMENTS: Record<CompanionRarity, number> = {
  common: 0,
  rare: 5,
  legendary: 10,
};

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
