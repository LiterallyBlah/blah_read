import { CompanionLoadout } from './types';

/**
 * Creates a default loadout with 3 empty slots and 1 unlocked slot.
 */
export function createDefaultLoadout(): CompanionLoadout {
  return { slots: [null, null, null], unlockedSlots: 1 };
}

/**
 * Equips a companion to a specific slot in the loadout.
 * @throws Error if slot index is invalid (< 0 or >= 3)
 * @throws Error if slot is locked (slotIndex >= unlockedSlots)
 */
export function equipCompanion(
  loadout: CompanionLoadout,
  companionId: string,
  slotIndex: number
): CompanionLoadout {
  if (slotIndex < 0 || slotIndex >= 3) {
    throw new Error(`Invalid slot index: ${slotIndex}`);
  }
  if (slotIndex >= loadout.unlockedSlots) {
    throw new Error(`Slot ${slotIndex + 1} is locked`);
  }
  const newSlots = [...loadout.slots];
  newSlots[slotIndex] = companionId;
  return { ...loadout, slots: newSlots as [string | null, string | null, string | null] };
}

/**
 * Removes a companion from a specific slot in the loadout.
 * @throws Error if slot index is invalid (< 0 or >= 3)
 */
export function unequipCompanion(
  loadout: CompanionLoadout,
  slotIndex: number
): CompanionLoadout {
  if (slotIndex < 0 || slotIndex >= 3) {
    throw new Error(`Invalid slot index: ${slotIndex}`);
  }
  const newSlots = [...loadout.slots];
  newSlots[slotIndex] = null;
  return { ...loadout, slots: newSlots as [string | null, string | null, string | null] };
}

/**
 * Returns an array of companion IDs that are currently equipped (non-null slots).
 */
export function getEquippedCompanionIds(loadout: CompanionLoadout): string[] {
  return loadout.slots.filter((id): id is string => id !== null);
}

/**
 * Checks if a slot is unlocked and accessible.
 */
export function isSlotUnlocked(loadout: CompanionLoadout, slotIndex: number): boolean {
  return slotIndex < loadout.unlockedSlots;
}
