// __tests__/lib/companionEffects.test.ts
import {
  EFFECT_TYPES,
  calculateEffectMagnitude,
  getAvailableEffectTypes,
  calculateActiveEffects,
  CompanionEffect,
  canEquipCompanion,
} from '../../lib/companionEffects';
import { Companion } from '../../lib/types';

describe('companionEffects', () => {
  it('should have 4 effect types', () => {
    expect(EFFECT_TYPES.length).toBe(4);
  });

  it('should calculate magnitude within rarity range', () => {
    const magnitude = calculateEffectMagnitude('common');
    expect(magnitude).toBeGreaterThanOrEqual(0.03);
    expect(magnitude).toBeLessThanOrEqual(0.07);
  });

  it('should calculate higher magnitude for legendary', () => {
    const magnitude = calculateEffectMagnitude('legendary');
    expect(magnitude).toBeGreaterThanOrEqual(0.25);
    expect(magnitude).toBeLessThanOrEqual(0.35);
  });

  it('should calculate magnitude within rare range', () => {
    const magnitude = calculateEffectMagnitude('rare');
    expect(magnitude).toBeGreaterThanOrEqual(0.12);
    expect(magnitude).toBeLessThanOrEqual(0.18);
  });

  describe('getAvailableEffectTypes', () => {
    it('should return all 4 effect types for legendary', () => {
      const effects = getAvailableEffectTypes('legendary');
      expect(effects.length).toBe(4);
      expect(effects).toContain('xp_boost');
      expect(effects).toContain('luck_boost');
      expect(effects).toContain('drop_rate_boost');
      expect(effects).toContain('completion_bonus');
    });

    it('should return only 3 effect types for common (excluding completion_bonus)', () => {
      const effects = getAvailableEffectTypes('common');
      expect(effects.length).toBe(3);
      expect(effects).toContain('xp_boost');
      expect(effects).toContain('luck_boost');
      expect(effects).toContain('drop_rate_boost');
      expect(effects).not.toContain('completion_bonus');
    });

    it('should return only 3 effect types for rare (excluding completion_bonus)', () => {
      const effects = getAvailableEffectTypes('rare');
      expect(effects.length).toBe(3);
      expect(effects).toContain('xp_boost');
      expect(effects).toContain('luck_boost');
      expect(effects).toContain('drop_rate_boost');
      expect(effects).not.toContain('completion_bonus');
    });
  });

  describe('calculateActiveEffects', () => {
    const mockCompanion = (effects: CompanionEffect[]): Companion => ({
      id: 'test',
      bookId: 'book-1',
      name: 'Test Companion',
      description: 'Test',
      rarity: 'common',
      type: 'character',
      source: 'discovered',
      unlockMethod: 'reading_time',
      traits: 'test traits',
      visualDescription: 'test visual',
      imageUrl: null,
      unlockedAt: Date.now(),
      effects,
    });

    it('should sum XP boost effects', () => {
      const companions = [
        mockCompanion([{ type: 'xp_boost', magnitude: 0.10 }]),
        mockCompanion([{ type: 'xp_boost', magnitude: 0.15 }]),
      ];
      const effects = calculateActiveEffects(companions, ['fantasy']);
      expect(effects.xpBoost).toBeCloseTo(0.25);
    });

    it('should only apply genre-targeted effects when genre matches', () => {
      const companions = [
        mockCompanion([{ type: 'xp_boost', magnitude: 0.20, targetGenre: 'fantasy' }]),
      ];
      const effectsMatch = calculateActiveEffects(companions, ['fantasy']);
      expect(effectsMatch.xpBoost).toBeCloseTo(0.20);

      const effectsNoMatch = calculateActiveEffects(companions, ['sci-fi']);
      expect(effectsNoMatch.xpBoost).toBeCloseTo(0);
    });

    it('should sum all effect types', () => {
      const companions = [
        mockCompanion([
          { type: 'xp_boost', magnitude: 0.10 },
          { type: 'luck_boost', magnitude: 0.05 },
        ]),
      ];
      const effects = calculateActiveEffects(companions, ['fantasy']);
      expect(effects.xpBoost).toBeCloseTo(0.10);
      expect(effects.luckBoost).toBeCloseTo(0.05);
    });

    it('should return zero for all effects when no companions', () => {
      const effects = calculateActiveEffects([], ['fantasy']);
      expect(effects.xpBoost).toBe(0);
      expect(effects.luckBoost).toBe(0);
      expect(effects.dropRateBoost).toBe(0);
      expect(effects.completionBonus).toBe(0);
    });

    it('should handle companions with no effects', () => {
      const companionNoEffects: Companion = {
        id: 'test',
        bookId: 'book-1',
        name: 'Test Companion',
        description: 'Test',
        rarity: 'common',
        type: 'character',
        source: 'discovered',
        unlockMethod: 'reading_time',
        traits: 'test traits',
        visualDescription: 'test visual',
        imageUrl: null,
        unlockedAt: Date.now(),
        // effects is undefined
      };
      const effects = calculateActiveEffects([companionNoEffects], ['fantasy']);
      expect(effects.xpBoost).toBe(0);
      expect(effects.luckBoost).toBe(0);
      expect(effects.dropRateBoost).toBe(0);
      expect(effects.completionBonus).toBe(0);
    });

    it('should sum drop_rate_boost and completion_bonus effects', () => {
      const companions = [
        mockCompanion([
          { type: 'drop_rate_boost', magnitude: 0.12 },
          { type: 'completion_bonus', magnitude: 0.30 },
        ]),
      ];
      const effects = calculateActiveEffects(companions, ['fantasy']);
      expect(effects.dropRateBoost).toBeCloseTo(0.12);
      expect(effects.completionBonus).toBeCloseTo(0.30);
    });

    it('should combine global and genre-targeted effects', () => {
      const companions = [
        mockCompanion([
          { type: 'xp_boost', magnitude: 0.10 }, // global
          { type: 'xp_boost', magnitude: 0.15, targetGenre: 'fantasy' }, // targeted
        ]),
      ];
      const effectsMatch = calculateActiveEffects(companions, ['fantasy']);
      expect(effectsMatch.xpBoost).toBeCloseTo(0.25);

      const effectsNoMatch = calculateActiveEffects(companions, ['sci-fi']);
      expect(effectsNoMatch.xpBoost).toBeCloseTo(0.10); // only global
    });

    it('should match when book has multiple genres', () => {
      const companions = [
        mockCompanion([{ type: 'xp_boost', magnitude: 0.20, targetGenre: 'sci-fi' }]),
      ];
      const effects = calculateActiveEffects(companions, ['fantasy', 'sci-fi']);
      expect(effects.xpBoost).toBeCloseTo(0.20);
    });
  });

  describe('canEquipCompanion', () => {
    it('should allow common companions with no requirements', () => {
      const result = canEquipCompanion('common', 'fantasy', 0, 0);
      expect(result.canEquip).toBe(true);
      expect(result.requiredGenreLevel).toBe(0);
      expect(result.requiredBookLevel).toBe(0);
    });

    it('should require genre level 10 and book level 5 for rare', () => {
      const result1 = canEquipCompanion('rare', 'fantasy', 9, 5);
      expect(result1.canEquip).toBe(false);
      expect(result1.missingGenreLevel).toBe(1);

      const result2 = canEquipCompanion('rare', 'fantasy', 10, 4);
      expect(result2.canEquip).toBe(false);
      expect(result2.missingBookLevel).toBe(1);

      const result3 = canEquipCompanion('rare', 'fantasy', 10, 5);
      expect(result3.canEquip).toBe(true);
    });

    it('should require genre level 20 and book level 10 for legendary', () => {
      const result = canEquipCompanion('legendary', 'fantasy', 20, 10);
      expect(result.canEquip).toBe(true);

      const result2 = canEquipCompanion('legendary', 'fantasy', 19, 10);
      expect(result2.canEquip).toBe(false);
      expect(result2.missingGenreLevel).toBe(1);
    });

    it('should only check book level for global companions (no targetGenre)', () => {
      // Global rare companion - only needs book level 5, no genre requirement
      const result1 = canEquipCompanion('rare', undefined, 0, 5);
      expect(result1.canEquip).toBe(true);

      const result2 = canEquipCompanion('rare', undefined, 0, 4);
      expect(result2.canEquip).toBe(false);
      expect(result2.missingBookLevel).toBe(1);
      expect(result2.missingGenreLevel).toBeUndefined();
    });

    it('should return both missing levels when both requirements not met', () => {
      const result = canEquipCompanion('legendary', 'fantasy', 15, 5);
      expect(result.canEquip).toBe(false);
      expect(result.missingGenreLevel).toBe(5);
      expect(result.missingBookLevel).toBe(5);
    });
  });
});
