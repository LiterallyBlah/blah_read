// __tests__/lib/dungeonAssets.test.ts
import {
  DUNGEON_TILES,
  FA_TILES,
  CHEST_TILES,
  CONSUMABLE_TILES,
  getChestTile,
  getConsumableTile,
  getConsumableTileForTier,
  getTierPixelSize,
} from '@/lib/dungeonAssets';

describe('dungeonAssets', () => {
  describe('DUNGEON_TILES', () => {
    it('exports chest tiles', () => {
      expect(DUNGEON_TILES.chest_wood_closed).toBeDefined();
      expect(DUNGEON_TILES.chest_silver_closed).toBeDefined();
      expect(DUNGEON_TILES.chest_gold_closed).toBeDefined();
      expect(DUNGEON_TILES.chest_open).toBeDefined();
    });

    it('exports character tiles', () => {
      expect(DUNGEON_TILES.character_knight).toBeDefined();
      expect(DUNGEON_TILES.character_wizard).toBeDefined();
    });
  });

  describe('FA_TILES', () => {
    it('exports XP consumable tiles with all scales', () => {
      expect(FA_TILES.minor_xp_scroll['2x']).toBeDefined();
      expect(FA_TILES.minor_xp_scroll['3x']).toBeDefined();
      expect(FA_TILES.minor_xp_scroll['4x']).toBeDefined();
      expect(FA_TILES.xp_scroll['2x']).toBeDefined();
      expect(FA_TILES.double_xp_tome['4x']).toBeDefined();
    });

    it('exports luck consumable tiles', () => {
      expect(FA_TILES.lucky_penny['2x']).toBeDefined();
      expect(FA_TILES.four_leaf_clover['3x']).toBeDefined();
      expect(FA_TILES.luck_charm['4x']).toBeDefined();
    });

    it('exports rare luck consumable tiles', () => {
      expect(FA_TILES.silver_horseshoe['2x']).toBeDefined();
      expect(FA_TILES.silver_star['4x']).toBeDefined();
    });

    it('exports legendary luck consumable tiles', () => {
      expect(FA_TILES.golden_star['2x']).toBeDefined();
      expect(FA_TILES.golden_star['4x']).toBeDefined();
    });

    it('exports drop rate boost consumable tiles', () => {
      expect(FA_TILES.treasure_map_scrap['2x']).toBeDefined();
      expect(FA_TILES.treasure_map['3x']).toBeDefined();
    });

    it('exports streak shield consumable tiles', () => {
      expect(FA_TILES.wooden_shield['2x']).toBeDefined();
      expect(FA_TILES.platinum_shield['3x']).toBeDefined();
    });

    it('exports special consumable tiles', () => {
      expect(FA_TILES.upgrade_charm['3x']).toBeDefined();
      expect(FA_TILES.genie_lamp['4x']).toBeDefined();
      expect(FA_TILES.time_warp_tome['4x']).toBeDefined();
    });
  });

  describe('getChestTile', () => {
    it('returns wood chest for wood tier', () => {
      expect(getChestTile('wood', 'closed')).toBeDefined();
    });

    it('returns silver chest for silver tier', () => {
      expect(getChestTile('silver', 'closed')).toBeDefined();
    });

    it('returns gold chest for gold tier', () => {
      expect(getChestTile('gold', 'closed')).toBeDefined();
    });

    it('returns open chest state', () => {
      expect(getChestTile('wood', 'open')).toBeDefined();
      expect(getChestTile('silver', 'open')).toBeDefined();
      expect(getChestTile('gold', 'open')).toBeDefined();
    });
  });

  describe('getConsumableTile (legacy)', () => {
    it('returns correct tile key for xp_boost', () => {
      expect(getConsumableTile('xp_boost')).toBe('minor_xp_scroll');
    });

    it('returns correct tile key for streak_shield', () => {
      expect(getConsumableTile('streak_shield')).toBe('wooden_shield');
    });

    it('returns correct tile key for all effect types', () => {
      expect(getConsumableTile('luck')).toBe('lucky_penny');
      expect(getConsumableTile('rare_luck')).toBe('silver_horseshoe');
      expect(getConsumableTile('legendary_luck')).toBe('golden_star');
      expect(getConsumableTile('drop_rate_boost')).toBe('treasure_map_scrap');
      expect(getConsumableTile('box_upgrade')).toBe('upgrade_charm');
      expect(getConsumableTile('guaranteed_companion')).toBe('genie_lamp');
      expect(getConsumableTile('instant_level')).toBe('time_warp_tome');
    });
  });

  describe('getConsumableTileForTier', () => {
    it('returns correct scale for each tier', () => {
      // Weak tier uses 2x scale
      const weakTile = getConsumableTileForTier('xp_boost', 'weak');
      expect(weakTile).toBe(FA_TILES.minor_xp_scroll['2x']);

      // Medium tier uses 3x scale
      const mediumTile = getConsumableTileForTier('xp_boost', 'medium');
      expect(mediumTile).toBe(FA_TILES.xp_scroll['3x']);

      // Strong tier uses 4x scale
      const strongTile = getConsumableTileForTier('xp_boost', 'strong');
      expect(strongTile).toBe(FA_TILES.double_xp_tome['4x']);
    });

    it('returns correct tiles for luck progression', () => {
      expect(getConsumableTileForTier('luck', 'weak')).toBe(FA_TILES.lucky_penny['2x']);
      expect(getConsumableTileForTier('luck', 'medium')).toBe(FA_TILES.four_leaf_clover['3x']);
      expect(getConsumableTileForTier('luck', 'strong')).toBe(FA_TILES.luck_charm['4x']);
    });

    it('returns correct tiles for streak shield progression', () => {
      expect(getConsumableTileForTier('streak_shield', 'weak')).toBe(FA_TILES.wooden_shield['2x']);
      expect(getConsumableTileForTier('streak_shield', 'medium')).toBe(FA_TILES.platinum_shield['3x']);
      expect(getConsumableTileForTier('streak_shield', 'strong')).toBe(FA_TILES.platinum_shield['4x']);
    });
  });

  describe('getTierPixelSize', () => {
    it('returns 32px for weak tier (2x scale)', () => {
      expect(getTierPixelSize('weak')).toBe(32);
    });

    it('returns 48px for medium tier (3x scale)', () => {
      expect(getTierPixelSize('medium')).toBe(48);
    });

    it('returns 64px for strong tier (4x scale)', () => {
      expect(getTierPixelSize('strong')).toBe(64);
    });
  });
});
