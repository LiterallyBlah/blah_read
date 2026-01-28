// lib/companionEffects.ts
import { CompanionRarity, Companion } from './types';
import { Genre } from './genres';

export const EFFECT_TYPES = [
  'xp_boost',
  'luck_boost',
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

export function calculateEffectMagnitude(rarity: CompanionRarity): number {
  const range = EFFECT_MAGNITUDES[rarity];
  return range.min + Math.random() * (range.max - range.min);
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
  luckBoost: number;
  dropRateBoost: number;
  completionBonus: number;
}

export function calculateActiveEffects(
  equippedCompanions: Companion[],
  bookGenres: Genre[]
): ActiveEffects {
  const effects: ActiveEffects = {
    xpBoost: 0,
    luckBoost: 0,
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
        case 'luck_boost':
          effects.luckBoost += effect.magnitude;
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
