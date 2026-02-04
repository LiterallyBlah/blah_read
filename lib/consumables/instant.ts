import { UserProgress } from '../shared';
import { ConsumableDefinition, ConsumableTier } from './definitions';

/**
 * Hours of streak protection by consumable tier.
 * weak (Calendar Page) = 24 hours (1 day)
 * medium (Calendar) = 72 hours (3 days)
 */
export const STREAK_SHIELD_HOURS: Record<ConsumableTier, number> = {
  weak: 24,
  medium: 72,
  strong: 72,
};

/**
 * Apply an instant consumable effect to progress.
 * Returns updated progress with the effect applied.
 *
 * For non-instant consumables (duration > 0), returns progress unchanged.
 */
export function applyInstantConsumable(
  progress: UserProgress,
  consumable: ConsumableDefinition,
  now: number = Date.now()
): UserProgress {
  if (consumable.duration !== 0) {
    return progress;
  }

  switch (consumable.effectType) {
    case 'streak_shield': {
      const hoursToAdd = STREAK_SHIELD_HOURS[consumable.tier];
      const msToAdd = hoursToAdd * 60 * 60 * 1000;
      const currentExpiry = progress.streakShieldExpiry;
      const baseTime = currentExpiry && currentExpiry > now ? currentExpiry : now;

      return {
        ...progress,
        streakShieldExpiry: baseTime + msToAdd,
      };
    }

    case 'box_upgrade':
      return {
        ...progress,
        pendingBoxUpgrade: true,
      };

    case 'guaranteed_companion':
      return {
        ...progress,
        pendingGuaranteedCompanion: true,
      };

    case 'instant_level':
      return {
        ...progress,
        pendingInstantLevels: (progress.pendingInstantLevels || 0) + 1,
      };

    default:
      return progress;
  }
}

export function hasStreakShield(progress: UserProgress, now: number = Date.now()): boolean {
  return progress.streakShieldExpiry != null && progress.streakShieldExpiry > now;
}

export function getStreakShieldHoursRemaining(progress: UserProgress, now: number = Date.now()): number {
  if (!hasStreakShield(progress, now)) return 0;
  return Math.ceil((progress.streakShieldExpiry! - now) / (60 * 60 * 1000));
}
