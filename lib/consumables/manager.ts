import { ActiveConsumable } from '../shared';
import { ConsumableDefinition, getConsumableById } from './definitions';

export interface ConsumableEffects {
  xpBoost: number;
  luck: number;           // was luckBoost
  rareLuck: number;       // NEW
  legendaryLuck: number;  // NEW
  dropRateBoost: number;
  streakShieldDays: number;
  boxUpgrade: boolean;
  guaranteedCompanion: boolean;
}

/**
 * Add a consumable to the active list.
 * Instant effects (duration 0) are not added.
 * Consumables with the same effect type stack by extending duration.
 */
export function addActiveConsumable(
  active: ActiveConsumable[],
  consumable: ConsumableDefinition
): ActiveConsumable[] {
  // Instant effects don't get added to active list
  if (consumable.duration === 0) {
    return active;
  }

  // Find existing active consumable with the same effect type
  const existingIndex = active.findIndex(ac => {
    const existingConsumable = getConsumableById(ac.consumableId);
    return existingConsumable?.effectType === consumable.effectType;
  });

  // If found, extend duration and combine magnitudes
  if (existingIndex !== -1) {
    return active.map((ac, index) => {
      if (index === existingIndex) {
        const existingConsumable = getConsumableById(ac.consumableId);
        const existingMagnitude = ac.stackedMagnitude ?? existingConsumable?.magnitude ?? 0;
        return {
          ...ac,
          remainingDuration: ac.remainingDuration + consumable.duration,
          stackedMagnitude: existingMagnitude + consumable.magnitude,
        };
      }
      return ac;
    });
  }

  // Otherwise, add as new entry
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
    luck: 0,
    rareLuck: 0,
    legendaryLuck: 0,
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

    // Use stacked magnitude if available, otherwise fall back to consumable's base magnitude
    const magnitude = activeConsumable.stackedMagnitude ?? consumable.magnitude;

    switch (consumable.effectType) {
      case 'xp_boost':
        effects.xpBoost += magnitude;
        break;
      case 'luck':
        effects.luck += magnitude;
        break;
      case 'rare_luck':
        effects.rareLuck += magnitude;
        break;
      case 'legendary_luck':
        effects.legendaryLuck += magnitude;
        break;
      case 'drop_rate_boost':
        effects.dropRateBoost += magnitude;
        break;
      case 'streak_shield':
        effects.streakShieldDays += magnitude;
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
 * Tick all consumables, decrementing duration by session minutes and removing expired ones.
 */
export function tickConsumables(active: ActiveConsumable[], sessionMinutes: number): ActiveConsumable[] {
  return active
    .map(c => ({
      ...c,
      remainingDuration: c.remainingDuration - sessionMinutes,
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

/**
 * Consolidate active consumables by merging entries with the same effect type.
 * This is a migration utility for existing data that has duplicate entries.
 * Returns the consolidated list and the count of entries that were merged.
 */
export function consolidateActiveConsumables(
  active: ActiveConsumable[]
): { consolidated: ActiveConsumable[]; mergedCount: number } {
  const effectTypeMap = new Map<string, ActiveConsumable>();
  let mergedCount = 0;

  for (const ac of active) {
    const consumable = getConsumableById(ac.consumableId);
    if (!consumable) continue;

    const effectType = consumable.effectType;
    const existing = effectTypeMap.get(effectType);

    if (existing) {
      // Merge: add durations and magnitudes
      const existingConsumable = getConsumableById(existing.consumableId);
      const existingMagnitude = existing.stackedMagnitude ?? existingConsumable?.magnitude ?? 0;
      const currentMagnitude = ac.stackedMagnitude ?? consumable.magnitude;

      effectTypeMap.set(effectType, {
        ...existing,
        remainingDuration: existing.remainingDuration + ac.remainingDuration,
        stackedMagnitude: existingMagnitude + currentMagnitude,
      });
      mergedCount++;
    } else {
      // First of this effect type
      effectTypeMap.set(effectType, { ...ac });
    }
  }

  return {
    consolidated: Array.from(effectTypeMap.values()),
    mergedCount,
  };
}
