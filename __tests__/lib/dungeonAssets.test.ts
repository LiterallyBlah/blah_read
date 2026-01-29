// __tests__/lib/dungeonAssets.test.ts
import {
  DUNGEON_TILES,
  CHEST_TILES,
  CONSUMABLE_TILES,
  getChestTile,
  getConsumableTile,
} from '@/lib/dungeonAssets';

describe('dungeonAssets', () => {
  describe('DUNGEON_TILES', () => {
    it('exports chest tiles', () => {
      expect(DUNGEON_TILES.chest_wood_closed).toBeDefined();
      expect(DUNGEON_TILES.chest_silver_closed).toBeDefined();
      expect(DUNGEON_TILES.chest_open).toBeDefined();
    });

    it('exports potion tiles', () => {
      expect(DUNGEON_TILES.potion_red).toBeDefined();
      expect(DUNGEON_TILES.potion_green).toBeDefined();
    });
  });

  describe('getChestTile', () => {
    it('returns wood chest for wood tier', () => {
      expect(getChestTile('wood', 'closed')).toBeDefined();
    });

    it('returns open chest state', () => {
      expect(getChestTile('wood', 'open')).toBeDefined();
    });
  });

  describe('getConsumableTile', () => {
    it('returns correct tile for xp_boost', () => {
      expect(getConsumableTile('xp_boost')).toBeDefined();
    });

    it('returns correct tile for streak_shield', () => {
      expect(getConsumableTile('streak_shield')).toBeDefined();
    });
  });
});
