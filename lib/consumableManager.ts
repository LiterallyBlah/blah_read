import { ActiveConsumable } from './types';
import { ConsumableDefinition, getConsumableById } from './consumables';

export interface ConsumableEffects {
  xpBoost: number;
  luckBoost: number;
  dropRateBoost: number;
  streakShieldDays: number;
  boxUpgrade: boolean;
  guaranteedCompanion: boolean;
}

/**
 * Add a consumable to the active list.
 * Instant effects (duration 0) are not added.
 */
export function addActiveConsumable(
  active: ActiveConsumable[],
  consumable: ConsumableDefinition
): ActiveConsumable[] {
  // Instant effects don't get added to active list
  if (consumable.duration === 0) {
    return active;
  }

  const newActive: ActiveConsumable = {
    consumableId: consumable.id,
    remainingDuration: consumable.duration,
    appliedAt: Date.now(),
  };

  return [...active, newActive];
}

/**
 * Get the combined effects from all active consumables.
 */
export function getActiveEffects(active: ActiveConsumable[]): ConsumableEffects {
  const effects: ConsumableEffects = {
    xpBoost: 0,
    luckBoost: 0,
    dropRateBoost: 0,
    streakShieldDays: 0,
    boxUpgrade: false,
    guaranteedCompanion: false,
  };

  for (const activeConsumable of active) {
    const consumable = getConsumableById(activeConsumable.consumableId);
    if (!consumable) {
      continue;
    }

    switch (consumable.effectType) {
      case 'xp_boost':
        effects.xpBoost += consumable.magnitude;
        break;
      case 'luck_boost':
        effects.luckBoost += consumable.magnitude;
        break;
      case 'drop_rate_boost':
        effects.dropRateBoost += consumable.magnitude;
        break;
      case 'streak_shield':
        effects.streakShieldDays += consumable.magnitude;
        break;
      case 'box_upgrade':
        effects.boxUpgrade = true;
        break;
      case 'guaranteed_companion':
        effects.guaranteedCompanion = true;
        break;
    }
  }

  return effects;
}

/**
 * Tick all consumables, decrementing duration and removing expired ones.
 */
export function tickConsumables(active: ActiveConsumable[]): ActiveConsumable[] {
  return active
    .map(c => ({
      ...c,
      remainingDuration: c.remainingDuration - 1,
    }))
    .filter(c => c.remainingDuration > 0);
}

/**
 * Remove one consumable of the matching effect type.
 * Used when a one-time effect (like box_upgrade) is consumed.
 */
export function removeUsedConsumable(
  active: ActiveConsumable[],
  effectType: string
): ActiveConsumable[] {
  let removed = false;

  return active.filter(activeConsumable => {
    if (removed) {
      return true;
    }

    const consumable = getConsumableById(activeConsumable.consumableId);
    if (consumable && consumable.effectType === effectType) {
      removed = true;
      return false;
    }

    return true;
  });
}
