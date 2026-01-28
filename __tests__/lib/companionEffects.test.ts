// __tests__/lib/companionEffects.test.ts
import {
  EFFECT_TYPES,
  calculateEffectMagnitude,
  getAvailableEffectTypes,
} from '../../lib/companionEffects';

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
});
