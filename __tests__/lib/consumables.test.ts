import {
  ConsumableTier,
  ConsumableDefinition,
  CONSUMABLES,
  getConsumablesByTier,
  getConsumableById,
} from '@/lib/consumables';

describe('consumables', () => {
  it('should have consumables for each tier', () => {
    expect(getConsumablesByTier('weak').length).toBeGreaterThan(0);
    expect(getConsumablesByTier('medium').length).toBeGreaterThan(0);
    expect(getConsumablesByTier('strong').length).toBeGreaterThan(0);
  });

  it('should have valid effect types on all consumables', () => {
    CONSUMABLES.forEach(c => {
      expect(c.effectType).toBeDefined();
      expect(c.magnitude).toBeGreaterThan(0);
    });
  });

  it('should have unique IDs for all consumables', () => {
    const ids = CONSUMABLES.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  describe('getConsumableById', () => {
    it('should return consumable for valid ID', () => {
      const consumable = getConsumableById('weak_xp_1');
      expect(consumable).toBeDefined();
      expect(consumable?.id).toBe('weak_xp_1');
      expect(consumable?.name).toBe('Minor XP Scroll');
    });

    it('should return undefined for invalid ID', () => {
      const consumable = getConsumableById('nonexistent_id');
      expect(consumable).toBeUndefined();
    });
  });

  describe('consumable luck stats', () => {
    it('should have luck effect for weak tier', () => {
      const weak = getConsumablesByTier('weak');
      const luckConsumable = weak.find(c => c.effectType === 'luck');
      expect(luckConsumable).toBeDefined();
      expect(luckConsumable?.magnitude).toBe(0.05);
    });

    it('should not have legendary_luck in weak tier', () => {
      const weak = getConsumablesByTier('weak');
      const legendaryLuck = weak.find(c => c.effectType === 'legendary_luck');
      expect(legendaryLuck).toBeUndefined();
    });

    it('should have rare_luck in medium tier', () => {
      const medium = getConsumablesByTier('medium');
      const rareLuck = medium.find(c => c.effectType === 'rare_luck');
      expect(rareLuck).toBeDefined();
    });

    it('should have legendary_luck in strong tier', () => {
      const strong = getConsumablesByTier('strong');
      const legendaryLuck = strong.find(c => c.effectType === 'legendary_luck');
      expect(legendaryLuck).toBeDefined();
      expect(legendaryLuck?.magnitude).toBe(0.15);
    });
  });
});
