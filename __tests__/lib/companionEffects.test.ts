// __tests__/lib/companionEffects.test.ts
import {
  EFFECT_TYPES,
  calculateEffectMagnitude,
  getAvailableEffectTypes,
  getAvailableLuckTypes,
  calculateActiveEffects,
  CompanionEffect,
  canEquipCompanion,
  ActiveEffects,
  rollCompanionEffects,
  backfillAllCompanionEffects,
} from '../../lib/companionEffects';
import { Companion } from '../../lib/types';

describe('companionEffects', () => {
  describe('ActiveEffects interface', () => {
    it('should have luck, rareLuck, legendaryLuck fields', () => {
      const effects: ActiveEffects = {
        xpBoost: 0,
        luck: 0.1,
        rareLuck: 0.05,
        legendaryLuck: 0.15,
        dropRateBoost: 0,
        completionBonus: 0,
      };
      expect(effects.luck).toBe(0.1);
      expect(effects.rareLuck).toBe(0.05);
      expect(effects.legendaryLuck).toBe(0.15);
    });
  });

  describe('new luck effect types', () => {
    it('should include luck, rare_luck, legendary_luck in EFFECT_TYPES', () => {
      expect(EFFECT_TYPES).toContain('luck');
      expect(EFFECT_TYPES).toContain('rare_luck');
      expect(EFFECT_TYPES).toContain('legendary_luck');
      expect(EFFECT_TYPES).not.toContain('luck_boost'); // Old name removed
    });
  });

  it('should have 6 effect types', () => {
    expect(EFFECT_TYPES.length).toBe(6);
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
    it('should return all 6 effect types for legendary', () => {
      const effects = getAvailableEffectTypes('legendary');
      expect(effects.length).toBe(6);
      expect(effects).toContain('xp_boost');
      expect(effects).toContain('luck');
      expect(effects).toContain('rare_luck');
      expect(effects).toContain('legendary_luck');
      expect(effects).toContain('drop_rate_boost');
      expect(effects).toContain('completion_bonus');
    });

    it('should return only 5 effect types for common (excluding completion_bonus)', () => {
      const effects = getAvailableEffectTypes('common');
      expect(effects.length).toBe(5);
      expect(effects).toContain('xp_boost');
      expect(effects).toContain('luck');
      expect(effects).toContain('rare_luck');
      expect(effects).toContain('legendary_luck');
      expect(effects).toContain('drop_rate_boost');
      expect(effects).not.toContain('completion_bonus');
    });

    it('should return only 5 effect types for rare (excluding completion_bonus)', () => {
      const effects = getAvailableEffectTypes('rare');
      expect(effects.length).toBe(5);
      expect(effects).toContain('xp_boost');
      expect(effects).toContain('luck');
      expect(effects).toContain('rare_luck');
      expect(effects).toContain('legendary_luck');
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
          { type: 'luck', magnitude: 0.05 },
        ]),
      ];
      const effects = calculateActiveEffects(companions, ['fantasy']);
      expect(effects.xpBoost).toBeCloseTo(0.10);
      expect(effects.luck).toBeCloseTo(0.05);
    });

    it('should return zero for all effects when no companions', () => {
      const effects = calculateActiveEffects([], ['fantasy']);
      expect(effects.xpBoost).toBe(0);
      expect(effects.luck).toBe(0);
      expect(effects.rareLuck).toBe(0);
      expect(effects.legendaryLuck).toBe(0);
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
      expect(effects.luck).toBe(0);
      expect(effects.rareLuck).toBe(0);
      expect(effects.legendaryLuck).toBe(0);
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

  describe('calculateActiveEffects with new luck types', () => {
    it('should sum luck effects correctly', () => {
      const companions: Companion[] = [
        {
          id: 'c1',
          bookId: 'b1',
          name: 'Test',
          type: 'creature',
          rarity: 'common',
          description: '',
          traits: '',
          visualDescription: '',
          imageUrl: null,
          source: 'discovered',
          unlockMethod: null,
          unlockedAt: null,
          effects: [{ type: 'luck', magnitude: 0.05 }],
        },
        {
          id: 'c2',
          bookId: 'b1',
          name: 'Test2',
          type: 'creature',
          rarity: 'legendary',
          description: '',
          traits: '',
          visualDescription: '',
          imageUrl: null,
          source: 'discovered',
          unlockMethod: null,
          unlockedAt: null,
          effects: [{ type: 'legendary_luck', magnitude: 0.25 }],
        },
      ];

      const result = calculateActiveEffects(companions, []);
      expect(result.luck).toBe(0.05);
      expect(result.rareLuck).toBe(0);
      expect(result.legendaryLuck).toBe(0.25);
    });

    it('should sum multiple companions with same luck type', () => {
      const companions: Companion[] = [
        {
          id: 'c1',
          bookId: 'b1',
          name: 'Test1',
          type: 'creature',
          rarity: 'common',
          description: '',
          traits: '',
          visualDescription: '',
          imageUrl: null,
          source: 'discovered',
          unlockMethod: null,
          unlockedAt: null,
          effects: [{ type: 'rare_luck', magnitude: 0.05 }],
        },
        {
          id: 'c2',
          bookId: 'b1',
          name: 'Test2',
          type: 'creature',
          rarity: 'rare',
          description: '',
          traits: '',
          visualDescription: '',
          imageUrl: null,
          source: 'discovered',
          unlockMethod: null,
          unlockedAt: null,
          effects: [{ type: 'rare_luck', magnitude: 0.15 }],
        },
      ];

      const result = calculateActiveEffects(companions, []);
      expect(result.rareLuck).toBeCloseTo(0.20);
    });

    it('should sum all three luck types from a single companion', () => {
      const companions: Companion[] = [
        {
          id: 'c1',
          bookId: 'b1',
          name: 'Lucky Charm',
          type: 'creature',
          rarity: 'legendary',
          description: '',
          traits: '',
          visualDescription: '',
          imageUrl: null,
          source: 'discovered',
          unlockMethod: null,
          unlockedAt: null,
          effects: [
            { type: 'luck', magnitude: 0.10 },
            { type: 'rare_luck', magnitude: 0.08 },
            { type: 'legendary_luck', magnitude: 0.30 },
          ],
        },
      ];

      const result = calculateActiveEffects(companions, []);
      expect(result.luck).toBeCloseTo(0.10);
      expect(result.rareLuck).toBeCloseTo(0.08);
      expect(result.legendaryLuck).toBeCloseTo(0.30);
    });
  });

  describe('getAvailableLuckTypes', () => {
    it('should return only luck for common', () => {
      expect(getAvailableLuckTypes('common')).toEqual(['luck']);
    });

    it('should return luck and rare_luck for rare', () => {
      expect(getAvailableLuckTypes('rare')).toEqual(['luck', 'rare_luck']);
    });

    it('should return all luck types for legendary', () => {
      expect(getAvailableLuckTypes('legendary')).toEqual(['luck', 'rare_luck', 'legendary_luck']);
    });
  });

  describe('canEquipCompanion', () => {
    it('should allow common companions with no book level requirement', () => {
      const result = canEquipCompanion('common', 0);
      expect(result.canEquip).toBe(true);
      expect(result.requiredBookLevel).toBe(0);
    });

    it('should require book level 5 for rare', () => {
      const result1 = canEquipCompanion('rare', 4);
      expect(result1.canEquip).toBe(false);
      expect(result1.missingBookLevel).toBe(1);
      expect(result1.requiredBookLevel).toBe(5);

      const result2 = canEquipCompanion('rare', 5);
      expect(result2.canEquip).toBe(true);
      expect(result2.missingBookLevel).toBeUndefined();
    });

    it('should require book level 10 for legendary', () => {
      const result1 = canEquipCompanion('legendary', 9);
      expect(result1.canEquip).toBe(false);
      expect(result1.missingBookLevel).toBe(1);
      expect(result1.requiredBookLevel).toBe(10);

      const result2 = canEquipCompanion('legendary', 10);
      expect(result2.canEquip).toBe(true);
    });

    it('should calculate correct missing levels', () => {
      const result = canEquipCompanion('legendary', 5);
      expect(result.canEquip).toBe(false);
      expect(result.missingBookLevel).toBe(5);
    });

    it('should allow equipping at exactly required level', () => {
      expect(canEquipCompanion('common', 0).canEquip).toBe(true);
      expect(canEquipCompanion('rare', 5).canEquip).toBe(true);
      expect(canEquipCompanion('legendary', 10).canEquip).toBe(true);
    });

    it('should allow equipping above required level', () => {
      expect(canEquipCompanion('common', 5).canEquip).toBe(true);
      expect(canEquipCompanion('rare', 10).canEquip).toBe(true);
      expect(canEquipCompanion('legendary', 15).canEquip).toBe(true);
    });
  });

  describe('rollCompanionEffects', () => {
    it('should always return at least 1 effect for legendary', () => {
      for (let i = 0; i < 20; i++) {
        const effects = rollCompanionEffects('legendary');
        expect(effects.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should always return at least 1 effect for rare', () => {
      for (let i = 0; i < 20; i++) {
        const effects = rollCompanionEffects('rare');
        expect(effects.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should sometimes return no effects for common (75% chance)', () => {
      let noEffectsCount = 0;
      for (let i = 0; i < 100; i++) {
        const effects = rollCompanionEffects('common');
        if (effects.length === 0) noEffectsCount++;
      }
      // Should have no effects roughly 75% of the time
      expect(noEffectsCount).toBeGreaterThan(50);
      expect(noEffectsCount).toBeLessThan(95);
    });

    it('should never have duplicate effect types', () => {
      for (let i = 0; i < 50; i++) {
        const effects = rollCompanionEffects('legendary');
        if (effects.length === 2) {
          expect(effects[0].type).not.toBe(effects[1].type);
        }
      }
    });

    it('should calculate magnitude in correct range for rarity', () => {
      const effects = rollCompanionEffects('legendary');
      expect(effects[0].magnitude).toBeGreaterThanOrEqual(0.25);
      expect(effects[0].magnitude).toBeLessThanOrEqual(0.35);
    });

    it('should sometimes target genres when provided', () => {
      let genreTargetedCount = 0;
      for (let i = 0; i < 100; i++) {
        const effects = rollCompanionEffects('legendary', ['fantasy']);
        const xpBoosts = effects.filter(e => e.type === 'xp_boost');
        for (const e of xpBoosts) {
          if (e.targetGenre === 'fantasy') genreTargetedCount++;
        }
      }
      // Should sometimes target genre (50% chance when xp_boost is rolled)
      expect(genreTargetedCount).toBeGreaterThan(0);
    });

    it('should not include completion_bonus for non-legendary', () => {
      for (let i = 0; i < 50; i++) {
        const effects = rollCompanionEffects('rare');
        expect(effects.some(e => e.type === 'completion_bonus')).toBe(false);
      }
    });
  });

  describe('backfillAllCompanionEffects', () => {
    const createMockCompanion = (id: string, rarity: 'common' | 'rare' | 'legendary', bookId = 'book-1'): Companion => ({
      id,
      bookId,
      name: `Companion ${id}`,
      type: 'character',
      rarity,
      description: 'Test',
      traits: 'Test',
      visualDescription: 'Test',
      imageUrl: null,
      source: 'discovered',
      unlockMethod: null,
      unlockedAt: null,
    });

    it('should return effects map for all companions', () => {
      const companions = [
        createMockCompanion('c1', 'legendary'),
        createMockCompanion('c2', 'rare'),
        createMockCompanion('c3', 'common'),
      ];

      const result = backfillAllCompanionEffects(companions);
      expect(result.size).toBe(3);
      expect(result.has('c1')).toBe(true);
      expect(result.has('c2')).toBe(true);
      expect(result.has('c3')).toBe(true);
    });

    it('should always give legendary and rare at least 1 effect', () => {
      const companions = [
        createMockCompanion('c1', 'legendary'),
        createMockCompanion('c2', 'rare'),
      ];

      for (let i = 0; i < 10; i++) {
        const result = backfillAllCompanionEffects(companions);
        expect(result.get('c1')).toBeDefined();
        expect(result.get('c1')!.length).toBeGreaterThanOrEqual(1);
        expect(result.get('c2')).toBeDefined();
        expect(result.get('c2')!.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should use book genres when provided', () => {
      const companions = [createMockCompanion('c1', 'legendary', 'book-fantasy')];
      const genresMap = new Map([['book-fantasy', ['fantasy'] as any]]);

      let genreTargetedCount = 0;
      for (let i = 0; i < 50; i++) {
        const result = backfillAllCompanionEffects(companions, genresMap);
        const effects = result.get('c1') || [];
        for (const e of effects) {
          if (e.targetGenre === 'fantasy') genreTargetedCount++;
        }
      }
      expect(genreTargetedCount).toBeGreaterThan(0);
    });
  });
});
