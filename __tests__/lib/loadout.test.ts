import {
  createDefaultLoadout,
  equipCompanion,
  unequipCompanion,
  getEquippedCompanionIds,
  isSlotUnlocked,
} from '@/lib/loadout';
import { CompanionLoadout } from '@/lib/types';

describe('createDefaultLoadout', () => {
  it('should create loadout with 1 unlocked slot', () => {
    const loadout = createDefaultLoadout();
    expect(loadout.unlockedSlots).toBe(1);
    expect(loadout.slots).toEqual([null, null, null]);
  });
});

describe('equipCompanion', () => {
  it('should equip companion to unlocked slot', () => {
    const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 2 };
    const result = equipCompanion(loadout, 'companion-1', 0);
    expect(result.slots[0]).toBe('companion-1');
  });

  it('should fail to equip to locked slot', () => {
    const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 1 };
    expect(() => equipCompanion(loadout, 'companion-1', 1)).toThrow();
  });

  it('should replace existing companion', () => {
    const loadout: CompanionLoadout = { slots: ['old-companion', null, null], unlockedSlots: 1 };
    const result = equipCompanion(loadout, 'new-companion', 0);
    expect(result.slots[0]).toBe('new-companion');
  });

  it('should fail for negative slot index', () => {
    const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 3 };
    expect(() => equipCompanion(loadout, 'companion-1', -1)).toThrow('Invalid slot index: -1');
  });

  it('should fail for slot index >= 3', () => {
    const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 3 };
    expect(() => equipCompanion(loadout, 'companion-1', 3)).toThrow('Invalid slot index: 3');
  });

  it('should not mutate the original loadout', () => {
    const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 2 };
    const result = equipCompanion(loadout, 'companion-1', 0);
    expect(loadout.slots[0]).toBeNull();
    expect(result.slots[0]).toBe('companion-1');
  });
});

describe('unequipCompanion', () => {
  it('should remove companion from slot', () => {
    const loadout: CompanionLoadout = { slots: ['companion-1', null, null], unlockedSlots: 1 };
    const result = unequipCompanion(loadout, 0);
    expect(result.slots[0]).toBeNull();
  });

  it('should handle already empty slot', () => {
    const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 1 };
    const result = unequipCompanion(loadout, 0);
    expect(result.slots[0]).toBeNull();
  });

  it('should fail for negative slot index', () => {
    const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 1 };
    expect(() => unequipCompanion(loadout, -1)).toThrow('Invalid slot index: -1');
  });

  it('should fail for slot index >= 3', () => {
    const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 1 };
    expect(() => unequipCompanion(loadout, 3)).toThrow('Invalid slot index: 3');
  });

  it('should not mutate the original loadout', () => {
    const loadout: CompanionLoadout = { slots: ['companion-1', null, null], unlockedSlots: 1 };
    const result = unequipCompanion(loadout, 0);
    expect(loadout.slots[0]).toBe('companion-1');
    expect(result.slots[0]).toBeNull();
  });
});

describe('getEquippedCompanionIds', () => {
  it('should return empty array when no companions equipped', () => {
    const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 1 };
    expect(getEquippedCompanionIds(loadout)).toEqual([]);
  });

  it('should return array of equipped companion IDs', () => {
    const loadout: CompanionLoadout = { slots: ['companion-1', null, 'companion-3'], unlockedSlots: 3 };
    expect(getEquippedCompanionIds(loadout)).toEqual(['companion-1', 'companion-3']);
  });

  it('should return all IDs when all slots filled', () => {
    const loadout: CompanionLoadout = { slots: ['a', 'b', 'c'], unlockedSlots: 3 };
    expect(getEquippedCompanionIds(loadout)).toEqual(['a', 'b', 'c']);
  });
});

describe('isSlotUnlocked', () => {
  it('should return true for unlocked slots', () => {
    const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 2 };
    expect(isSlotUnlocked(loadout, 0)).toBe(true);
    expect(isSlotUnlocked(loadout, 1)).toBe(true);
  });

  it('should return false for locked slots', () => {
    const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 1 };
    expect(isSlotUnlocked(loadout, 1)).toBe(false);
    expect(isSlotUnlocked(loadout, 2)).toBe(false);
  });

  it('should handle all slots unlocked', () => {
    const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 3 };
    expect(isSlotUnlocked(loadout, 0)).toBe(true);
    expect(isSlotUnlocked(loadout, 1)).toBe(true);
    expect(isSlotUnlocked(loadout, 2)).toBe(true);
  });
});
