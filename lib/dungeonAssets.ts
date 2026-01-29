import type { LootBoxTier } from './types';
import type { ConsumableEffectType } from './consumables';

// Tile require mappings - React Native needs static requires
export const DUNGEON_TILES = {
  // Chests
  chest_wood_closed: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0054.png'),
  chest_silver_closed: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0055.png'),
  chest_gold_closed: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0055.png'), // Tinted in component
  chest_open: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0067.png'),

  // Potions
  potion_red: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0103.png'),
  potion_green: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0114.png'),
  potion_blue: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0113.png'),
  potion_gold: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0127.png'),

  // Items
  scroll: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0105.png'),
  shield: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0102.png'),
  gem: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0056.png'),
  coin: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0101.png'),

  // Characters (for companion placeholders)
  character_knight: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0100.png'),
  character_wizard: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0110.png'),
} as const;

// Chest state/tier mapping
export const CHEST_TILES: Record<LootBoxTier, { closed: keyof typeof DUNGEON_TILES; open: keyof typeof DUNGEON_TILES }> = {
  wood: { closed: 'chest_wood_closed', open: 'chest_open' },
  silver: { closed: 'chest_silver_closed', open: 'chest_open' },
  gold: { closed: 'chest_gold_closed', open: 'chest_open' },
};

// Consumable effect type to tile mapping
export const CONSUMABLE_TILES: Record<ConsumableEffectType, keyof typeof DUNGEON_TILES> = {
  xp_boost: 'potion_green',
  luck: 'gem',
  rare_luck: 'potion_blue',
  legendary_luck: 'potion_gold',
  drop_rate_boost: 'potion_red',
  streak_shield: 'shield',
  box_upgrade: 'chest_wood_closed',
  guaranteed_companion: 'character_knight',
  instant_level: 'scroll',
};

export function getChestTile(tier: LootBoxTier, state: 'closed' | 'open'): number {
  const tileKey = CHEST_TILES[tier][state];
  return DUNGEON_TILES[tileKey];
}

export function getConsumableTile(effectType: ConsumableEffectType): number {
  const tileKey = CONSUMABLE_TILES[effectType];
  return DUNGEON_TILES[tileKey];
}
