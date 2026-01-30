export type BookTier = 'common' | 'rare' | 'legendary';

/**
 * Get the tier for a book based on its level
 * - Common: levels 1-3
 * - Rare: levels 4-6
 * - Legendary: level 7+
 */
export function getBookTier(level: number): BookTier {
  if (level >= 7) return 'legendary';
  if (level >= 4) return 'rare';
  return 'common';
}

/**
 * Get the rarity color key for a tier (matches theme.ts rarity colors)
 */
export function getTierColorKey(tier: BookTier): 'rarityCommon' | 'rarityRare' | 'rarityLegendary' {
  switch (tier) {
    case 'legendary': return 'rarityLegendary';
    case 'rare': return 'rarityRare';
    case 'common': return 'rarityCommon';
    default: {
      const _exhaustive: never = tier;
      throw new Error(`Unknown tier: ${_exhaustive}`);
    }
  }
}

/**
 * Get shadow/glow properties for a tier
 * Returns values for React Native shadow props (iOS) and elevation (Android)
 */
export function getTierGlow(tier: BookTier): {
  shadowRadius: number;
  shadowOpacity: number;
  elevation: number;
} {
  switch (tier) {
    case 'legendary':
      return { shadowRadius: 12, shadowOpacity: 0.8, elevation: 8 };
    case 'rare':
      return { shadowRadius: 8, shadowOpacity: 0.5, elevation: 4 };
    case 'common':
      return { shadowRadius: 0, shadowOpacity: 0, elevation: 0 };
  }
}
