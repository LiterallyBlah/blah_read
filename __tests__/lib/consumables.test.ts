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
});
