import type { LootBoxTier } from './shared';
import type { ConsumableEffectType, ConsumableTier } from './consumables';

// Tier color configuration for chest tinting and glow effects
// Using subtle 35% opacity to preserve wood detail while showing tier color
export const TIER_COLORS: Record<LootBoxTier, {
  tint: string | null;
  tintOpacity: number;
  glow: string;
}> = {
  wood: {
    tint: null,           // No tint - natural brown
    tintOpacity: 0,
    glow: '#8B7355',      // Warm brown glow
  },
  silver: {
    tint: '#B8C8D8',      // Light silver-blue
    tintOpacity: 0.35,    // Subtle blend preserves wood detail
    glow: '#C0C0C0',      // Silver glow
  },
  gold: {
    tint: '#FFD700',      // Warm gold
    tintOpacity: 0.35,    // Subtle blend preserves wood detail
    glow: '#FFD700',      // Gold glow
  },
};

export function getTierGlowColor(tier: LootBoxTier): string {
  return TIER_COLORS[tier].glow;
}

// Tile require mappings - React Native needs static requires
export const DUNGEON_TILES = {
  // Chests
  chest_wood_closed: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0089.png'),
  chest_silver_closed: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0089.png'),
  chest_gold_closed: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0089.png'), // Tinted in component
  chest_open: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0092.png'),

  // Characters (for companion placeholders)
  character_knight: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0100.png'),
  character_wizard: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0110.png'),
} as const;

// FA consumable tiles - pre-scaled for crisp pixel art
// Each tile has 2x (32px), 3x (48px), and 4x (64px) versions
export const FA_TILES = {
  // XP boost consumables
  minor_xp_scroll: {
    '2x': require('@/assets/16x16-scaled/2x/fa297.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa297.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa297.png'),
  },
  xp_scroll: {
    '2x': require('@/assets/16x16-scaled/2x/fa298.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa298.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa298.png'),
  },
  double_xp_tome: {
    '2x': require('@/assets/16x16-scaled/2x/fa289.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa289.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa289.png'),
  },

  // Luck consumables
  lucky_penny: {
    '2x': require('@/assets/16x16-scaled/2x/fa132.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa132.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa132.png'),
  },
  four_leaf_clover: {
    '2x': require('@/assets/16x16-scaled/2x/fa668.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa668.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa668.png'),
  },
  luck_charm: {
    '2x': require('@/assets/16x16-scaled/2x/fa176.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa176.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa176.png'),
  },

  // Rare luck consumables
  silver_horseshoe: {
    '2x': require('@/assets/16x16-scaled/2x/fa116.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa116.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa116.png'),
  },
  silver_star: {
    '2x': require('@/assets/16x16-scaled/2x/fa214.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa214.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa214.png'),
  },

  // Legendary luck consumable
  golden_star: {
    '2x': require('@/assets/16x16-scaled/2x/fa12.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa12.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa12.png'),
  },

  // Drop rate boost consumables
  treasure_map_scrap: {
    '2x': require('@/assets/16x16-scaled/2x/fa314.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa314.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa314.png'),
  },
  treasure_map: {
    '2x': require('@/assets/16x16-scaled/2x/fa320.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa320.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa320.png'),
  },

  // Streak shield consumables
  wooden_shield: {
    '2x': require('@/assets/16x16-scaled/2x/fa1810.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa1810.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa1810.png'),
  },
  platinum_shield: {
    '2x': require('@/assets/16x16-scaled/2x/fa1811.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa1811.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa1811.png'),
  },

  // Box upgrade consumable
  upgrade_charm: {
    '2x': require('@/assets/16x16-scaled/2x/fa294.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa294.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa294.png'),
  },

  // Guaranteed companion consumable
  genie_lamp: {
    '2x': require('@/assets/16x16-scaled/2x/fa67.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa67.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa67.png'),
  },

  // Instant level consumable
  time_warp_tome: {
    '2x': require('@/assets/16x16-scaled/2x/fa199.png'),
    '3x': require('@/assets/16x16-scaled/3x/fa199.png'),
    '4x': require('@/assets/16x16-scaled/4x/fa199.png'),
  },
} as const;

export type FATileKey = keyof typeof FA_TILES;
export type ScaleKey = '2x' | '3x' | '4x';

// Map effect type + tier to the appropriate FA tile
const CONSUMABLE_TILE_MAP: Record<ConsumableEffectType, Record<ConsumableTier, FATileKey>> = {
  xp_boost: {
    weak: 'minor_xp_scroll',
    medium: 'xp_scroll',
    strong: 'double_xp_tome',
  },
  luck: {
    weak: 'lucky_penny',
    medium: 'four_leaf_clover',
    strong: 'luck_charm',
  },
  rare_luck: {
    weak: 'silver_horseshoe',   // No weak version, use medium
    medium: 'silver_horseshoe',
    strong: 'silver_star',
  },
  legendary_luck: {
    weak: 'golden_star',        // Only strong exists, use it for all
    medium: 'golden_star',
    strong: 'golden_star',
  },
  drop_rate_boost: {
    weak: 'treasure_map_scrap',
    medium: 'treasure_map',
    strong: 'treasure_map',     // No strong version, use medium
  },
  streak_shield: {
    weak: 'wooden_shield',
    medium: 'platinum_shield',
    strong: 'platinum_shield',  // No strong version, use medium
  },
  box_upgrade: {
    weak: 'upgrade_charm',      // Only medium exists, use it for all
    medium: 'upgrade_charm',
    strong: 'upgrade_charm',
  },
  guaranteed_companion: {
    weak: 'genie_lamp',         // Only strong exists, use it for all
    medium: 'genie_lamp',
    strong: 'genie_lamp',
  },
  instant_level: {
    weak: 'time_warp_tome',     // Only strong exists, use it for all
    medium: 'time_warp_tome',
    strong: 'time_warp_tome',
  },
};

// Map tier to scale
const TIER_SCALE: Record<ConsumableTier, ScaleKey> = {
  weak: '2x',
  medium: '3x',
  strong: '4x',
};

// Chest state/tier mapping
export const CHEST_TILES: Record<LootBoxTier, { closed: keyof typeof DUNGEON_TILES; open: keyof typeof DUNGEON_TILES }> = {
  wood: { closed: 'chest_wood_closed', open: 'chest_open' },
  silver: { closed: 'chest_silver_closed', open: 'chest_open' },
  gold: { closed: 'chest_gold_closed', open: 'chest_open' },
};

// Legacy mapping for backward compatibility (used by PixelSprite)
export const CONSUMABLE_TILES: Record<ConsumableEffectType, FATileKey> = {
  xp_boost: 'minor_xp_scroll',
  luck: 'lucky_penny',
  rare_luck: 'silver_horseshoe',
  legendary_luck: 'golden_star',
  drop_rate_boost: 'treasure_map_scrap',
  streak_shield: 'wooden_shield',
  box_upgrade: 'upgrade_charm',
  guaranteed_companion: 'genie_lamp',
  instant_level: 'time_warp_tome',
};

export function getChestTile(tier: LootBoxTier, state: 'closed' | 'open'): number {
  const tileKey = CHEST_TILES[tier][state];
  return DUNGEON_TILES[tileKey];
}

/**
 * Get the appropriate FA consumable tile for an effect type and tier.
 * Returns the pre-scaled image source for crisp pixel art rendering.
 */
export function getConsumableTileForTier(
  effectType: ConsumableEffectType,
  tier: ConsumableTier
): number {
  const tileKey = CONSUMABLE_TILE_MAP[effectType][tier];
  const scale = TIER_SCALE[tier];
  return FA_TILES[tileKey][scale];
}

/**
 * Get the pixel size for a tier's scale.
 */
export function getTierPixelSize(tier: ConsumableTier): number {
  const BASE_SIZE = 16;
  const scaleMultiplier = tier === 'strong' ? 4 : tier === 'medium' ? 3 : 2;
  return BASE_SIZE * scaleMultiplier;
}

// Legacy function for backward compatibility
export function getConsumableTile(effectType: ConsumableEffectType): FATileKey {
  return CONSUMABLE_TILES[effectType];
}
