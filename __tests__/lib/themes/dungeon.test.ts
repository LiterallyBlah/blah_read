// __tests__/lib/themes/dungeon.test.ts
import { COLORS_DUNGEON } from '@/lib/themes/dungeon';

describe('dungeon theme', () => {
  it('exports dungeon color palette', () => {
    expect(COLORS_DUNGEON.background).toBe('#1a1a1a');
    expect(COLORS_DUNGEON.surface).toBe('#2d2d2d');
    expect(COLORS_DUNGEON.card).toBe('#3a3a3a');
    expect(COLORS_DUNGEON.text).toBe('#f5deb3');
    expect(COLORS_DUNGEON.textSecondary).toBe('#c4a574');
    expect(COLORS_DUNGEON.accent).toBe('#ffb347');
  });

  it('exports rarity colors for loot tiers', () => {
    expect(COLORS_DUNGEON.rarityCommon).toBe('#8b4513');
    expect(COLORS_DUNGEON.rarityRare).toBe('#c0c0c0');
    expect(COLORS_DUNGEON.rarityLegendary).toBe('#ffd700');
  });
});
