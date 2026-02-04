import { UserProgress } from '@/lib/shared';
import { ConsumableDefinition } from '@/lib/consumables';
import {
  applyInstantConsumable,
  STREAK_SHIELD_HOURS,
} from '@/lib/instantConsumables';

// Helper to create minimal UserProgress
function createProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    lootItems: [],
    lootBoxes: { availableBoxes: [], openHistory: [] },
    booksFinished: 0,
    booksAdded: 0,
    totalHoursRead: 0,
    streakShieldExpiry: null,
    pendingBoxUpgrade: false,
    pendingGuaranteedCompanion: false,
    pendingInstantLevels: 0,
    ...overrides,
  };
}

describe('applyInstantConsumable', () => {
  describe('streak_shield', () => {
    it('should set streakShieldExpiry for 1-day shield', () => {
      const consumable: ConsumableDefinition = {
        id: 'weak_streak_1',
        name: 'Calendar Page',
        description: '1-day streak shield',
        tier: 'weak',
        effectType: 'streak_shield',
        magnitude: 1,
        duration: 0,
      };
      const progress = createProgress();
      const now = Date.now();

      const result = applyInstantConsumable(progress, consumable, now);

      expect(result.streakShieldExpiry).toBe(now + STREAK_SHIELD_HOURS.weak * 60 * 60 * 1000);
    });

    it('should set streakShieldExpiry for 3-day shield', () => {
      const consumable: ConsumableDefinition = {
        id: 'med_streak_1',
        name: 'Calendar',
        description: '3-day streak shield',
        tier: 'medium',
        effectType: 'streak_shield',
        magnitude: 3,
        duration: 0,
      };
      const progress = createProgress();
      const now = Date.now();

      const result = applyInstantConsumable(progress, consumable, now);

      expect(result.streakShieldExpiry).toBe(now + STREAK_SHIELD_HOURS.medium * 60 * 60 * 1000);
    });

    it('should extend existing shield', () => {
      const consumable: ConsumableDefinition = {
        id: 'weak_streak_1',
        name: 'Calendar Page',
        description: '1-day streak shield',
        tier: 'weak',
        effectType: 'streak_shield',
        magnitude: 1,
        duration: 0,
      };
      const now = Date.now();
      const existingExpiry = now + 12 * 60 * 60 * 1000;
      const progress = createProgress({ streakShieldExpiry: existingExpiry });

      const result = applyInstantConsumable(progress, consumable, now);

      expect(result.streakShieldExpiry).toBe(existingExpiry + STREAK_SHIELD_HOURS.weak * 60 * 60 * 1000);
    });
  });

  describe('box_upgrade', () => {
    it('should set pendingBoxUpgrade to true', () => {
      const consumable: ConsumableDefinition = {
        id: 'med_upgrade_1',
        name: 'Polish Kit',
        description: 'Upgrade next box tier',
        tier: 'medium',
        effectType: 'box_upgrade',
        magnitude: 1,
        duration: 0,
      };
      const progress = createProgress();

      const result = applyInstantConsumable(progress, consumable);

      expect(result.pendingBoxUpgrade).toBe(true);
    });
  });

  describe('guaranteed_companion', () => {
    it('should set pendingGuaranteedCompanion to true', () => {
      const consumable: ConsumableDefinition = {
        id: 'strong_companion_1',
        name: 'Companion Summon',
        description: 'Guaranteed companion on next box',
        tier: 'strong',
        effectType: 'guaranteed_companion',
        magnitude: 1,
        duration: 0,
      };
      const progress = createProgress();

      const result = applyInstantConsumable(progress, consumable);

      expect(result.pendingGuaranteedCompanion).toBe(true);
    });
  });

  describe('instant_level', () => {
    it('should increment pendingInstantLevels', () => {
      const consumable: ConsumableDefinition = {
        id: 'strong_level_1',
        name: 'Time Warp',
        description: 'Instant level up on current book',
        tier: 'strong',
        effectType: 'instant_level',
        magnitude: 1,
        duration: 0,
      };
      const progress = createProgress();

      const result = applyInstantConsumable(progress, consumable);

      expect(result.pendingInstantLevels).toBe(1);
    });

    it('should stack multiple instant levels', () => {
      const consumable: ConsumableDefinition = {
        id: 'strong_level_1',
        name: 'Time Warp',
        description: 'Instant level up on current book',
        tier: 'strong',
        effectType: 'instant_level',
        magnitude: 1,
        duration: 0,
      };
      const progress = createProgress({ pendingInstantLevels: 2 });

      const result = applyInstantConsumable(progress, consumable);

      expect(result.pendingInstantLevels).toBe(3);
    });
  });

  describe('non-instant consumables', () => {
    it('should return progress unchanged for duration > 0 consumables', () => {
      const consumable: ConsumableDefinition = {
        id: 'weak_xp_1',
        name: 'Minor XP Scroll',
        description: '+10% XP for 60 min',
        tier: 'weak',
        effectType: 'xp_boost',
        magnitude: 0.10,
        duration: 60,
      };
      const progress = createProgress();

      const result = applyInstantConsumable(progress, consumable);

      expect(result).toEqual(progress);
    });
  });
});
