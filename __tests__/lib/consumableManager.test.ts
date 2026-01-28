import { ActiveConsumable } from '@/lib/types';
import { CONSUMABLES, getConsumableById } from '@/lib/consumables';
import {
  ConsumableEffects,
  addActiveConsumable,
  getActiveEffects,
  tickConsumables,
  removeUsedConsumable,
} from '@/lib/consumableManager';

describe('addActiveConsumable', () => {
  it('should add new consumable to active list', () => {
    const consumable = CONSUMABLES.find(c => c.id === 'weak_xp_1')!;
    const result = addActiveConsumable([], consumable);
    expect(result.length).toBe(1);
    expect(result[0].consumableId).toBe('weak_xp_1');
    expect(result[0].remainingDuration).toBe(1);
  });

  it('should stack same consumables additively', () => {
    const consumable = CONSUMABLES.find(c => c.id === 'weak_xp_1')!;
    let active = addActiveConsumable([], consumable);
    active = addActiveConsumable(active, consumable);
    expect(active.length).toBe(2);
  });

  it('should not add instant effect consumables (duration 0)', () => {
    const consumable = CONSUMABLES.find(c => c.id === 'strong_level_1')!;
    expect(consumable.duration).toBe(0); // Verify it's instant
    const result = addActiveConsumable([], consumable);
    expect(result.length).toBe(0);
  });

  it('should set appliedAt timestamp', () => {
    const consumable = CONSUMABLES.find(c => c.id === 'weak_xp_1')!;
    const before = Date.now();
    const result = addActiveConsumable([], consumable);
    const after = Date.now();
    expect(result[0].appliedAt).toBeGreaterThanOrEqual(before);
    expect(result[0].appliedAt).toBeLessThanOrEqual(after);
  });

  it('should preserve existing active consumables', () => {
    const existing: ActiveConsumable[] = [
      { consumableId: 'weak_luck_1', remainingDuration: 2, appliedAt: Date.now() },
    ];
    const consumable = CONSUMABLES.find(c => c.id === 'weak_xp_1')!;
    const result = addActiveConsumable(existing, consumable);
    expect(result.length).toBe(2);
    expect(result[0].consumableId).toBe('weak_luck_1');
    expect(result[1].consumableId).toBe('weak_xp_1');
  });
});

describe('getActiveEffects', () => {
  it('should return zero effects for empty active list', () => {
    const effects = getActiveEffects([]);
    expect(effects.xpBoost).toBe(0);
    expect(effects.luckBoost).toBe(0);
    expect(effects.dropRateBoost).toBe(0);
    expect(effects.streakShieldDays).toBe(0);
    expect(effects.boxUpgrade).toBe(false);
    expect(effects.guaranteedCompanion).toBe(false);
  });

  it('should sum effects from active consumables', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'weak_xp_1', remainingDuration: 1, appliedAt: Date.now() },
      { consumableId: 'med_xp_1', remainingDuration: 1, appliedAt: Date.now() },
    ];
    const effects = getActiveEffects(active);
    expect(effects.xpBoost).toBeCloseTo(0.35); // 0.10 + 0.25
  });

  it('should sum luck boosts', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'weak_luck_1', remainingDuration: 2, appliedAt: Date.now() },
      { consumableId: 'med_luck_1', remainingDuration: 3, appliedAt: Date.now() },
    ];
    const effects = getActiveEffects(active);
    expect(effects.luckBoost).toBeCloseTo(0.20); // 0.05 + 0.15
  });

  it('should sum drop rate boosts', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'weak_drop_1', remainingDuration: 1, appliedAt: Date.now() },
      { consumableId: 'med_drop_1', remainingDuration: 2, appliedAt: Date.now() },
    ];
    const effects = getActiveEffects(active);
    expect(effects.dropRateBoost).toBeCloseTo(0.30); // 0.10 + 0.20
  });

  it('should sum streak shield days from magnitude', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'weak_streak_1', remainingDuration: 1, appliedAt: Date.now() },
      { consumableId: 'med_streak_1', remainingDuration: 1, appliedAt: Date.now() },
    ];
    const effects = getActiveEffects(active);
    expect(effects.streakShieldDays).toBe(4); // 1 + 3
  });

  it('should set boxUpgrade to true when box_upgrade consumable is active', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'med_upgrade_1', remainingDuration: 1, appliedAt: Date.now() },
    ];
    const effects = getActiveEffects(active);
    expect(effects.boxUpgrade).toBe(true);
  });

  it('should set guaranteedCompanion to true when guaranteed_companion consumable is active', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'strong_companion_1', remainingDuration: 1, appliedAt: Date.now() },
    ];
    const effects = getActiveEffects(active);
    expect(effects.guaranteedCompanion).toBe(true);
  });

  it('should ignore unknown consumable IDs', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'nonexistent_consumable', remainingDuration: 1, appliedAt: Date.now() },
    ];
    const effects = getActiveEffects(active);
    expect(effects.xpBoost).toBe(0);
  });
});

describe('tickConsumables', () => {
  it('should decrement duration and remove expired', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'weak_xp_1', remainingDuration: 1, appliedAt: Date.now() },
      { consumableId: 'med_xp_1', remainingDuration: 2, appliedAt: Date.now() },
    ];
    const result = tickConsumables(active);
    expect(result.length).toBe(1);
    expect(result[0].consumableId).toBe('med_xp_1');
    expect(result[0].remainingDuration).toBe(1);
  });

  it('should return empty array when all consumables expire', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'weak_xp_1', remainingDuration: 1, appliedAt: Date.now() },
    ];
    const result = tickConsumables(active);
    expect(result.length).toBe(0);
  });

  it('should handle empty active list', () => {
    const result = tickConsumables([]);
    expect(result.length).toBe(0);
  });

  it('should preserve appliedAt timestamps', () => {
    const appliedAt = Date.now() - 10000;
    const active: ActiveConsumable[] = [
      { consumableId: 'med_xp_1', remainingDuration: 2, appliedAt },
    ];
    const result = tickConsumables(active);
    expect(result[0].appliedAt).toBe(appliedAt);
  });

  it('should decrement all consumables', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'med_luck_1', remainingDuration: 3, appliedAt: Date.now() },
      { consumableId: 'strong_luck_1', remainingDuration: 5, appliedAt: Date.now() },
    ];
    const result = tickConsumables(active);
    expect(result.length).toBe(2);
    expect(result[0].remainingDuration).toBe(2);
    expect(result[1].remainingDuration).toBe(4);
  });
});

describe('removeUsedConsumable', () => {
  it('should remove one consumable of matching effect type', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'med_upgrade_1', remainingDuration: 1, appliedAt: Date.now() },
    ];
    const result = removeUsedConsumable(active, 'box_upgrade');
    expect(result.length).toBe(0);
  });

  it('should remove only one consumable when multiple exist', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'weak_xp_1', remainingDuration: 1, appliedAt: Date.now() },
      { consumableId: 'med_xp_1', remainingDuration: 1, appliedAt: Date.now() },
    ];
    const result = removeUsedConsumable(active, 'xp_boost');
    expect(result.length).toBe(1);
  });

  it('should not remove consumables of different effect type', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'weak_xp_1', remainingDuration: 1, appliedAt: Date.now() },
      { consumableId: 'weak_luck_1', remainingDuration: 2, appliedAt: Date.now() },
    ];
    const result = removeUsedConsumable(active, 'box_upgrade');
    expect(result.length).toBe(2);
  });

  it('should handle empty active list', () => {
    const result = removeUsedConsumable([], 'xp_boost');
    expect(result.length).toBe(0);
  });

  it('should handle unknown effect type', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'weak_xp_1', remainingDuration: 1, appliedAt: Date.now() },
    ];
    const result = removeUsedConsumable(active, 'nonexistent_effect');
    expect(result.length).toBe(1);
  });
});
