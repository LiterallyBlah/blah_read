import {
  createDefaultLoadout,
  equipCompanion,
  unequipCompanion,
  getEquippedCompanionIds,
  isSlotUnlocked,
  getBookLoadout,
  equipCompanionToBook,
  unequipCompanionFromBook,
  getBookEquippedCompanionIds,
  CompanionLoadout,
  Book,
} from '@/lib/shared';
import { storage } from '@/lib/storage';

jest.mock('@/lib/storage');

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

// ============================================
// Per-Book Loadout Functions Tests
// ============================================

describe('getBookLoadout', () => {
  it('returns book loadout when present', () => {
    const book: Partial<Book> = {
      id: 'book-1',
      loadout: { slots: ['comp-1', null, null], unlockedSlots: 2 },
    };
    const loadout = getBookLoadout(book as Book);
    expect(loadout.slots).toEqual(['comp-1', null, null]);
    expect(loadout.unlockedSlots).toBe(2);
  });

  it('returns default loadout when book has no loadout', () => {
    const book: Partial<Book> = {
      id: 'book-1',
      // no loadout field
    };
    const loadout = getBookLoadout(book as Book);
    expect(loadout.slots).toEqual([null, null, null]);
    expect(loadout.unlockedSlots).toBe(1);
  });
});

describe('equipCompanionToBook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('equips companion to book and saves', async () => {
    const book: Partial<Book> = {
      id: 'book-1',
      title: 'Test Book',
      loadout: { slots: [null, null, null], unlockedSlots: 2 },
    };
    (storage.getBooks as jest.Mock).mockResolvedValue([book]);
    (storage.saveBook as jest.Mock).mockResolvedValue(undefined);

    const result = await equipCompanionToBook('book-1', 'companion-1', 0);

    expect(result.loadout?.slots[0]).toBe('companion-1');
    expect(storage.saveBook).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'book-1',
        loadout: { slots: ['companion-1', null, null], unlockedSlots: 2 },
      })
    );
  });

  it('throws error when book not found', async () => {
    (storage.getBooks as jest.Mock).mockResolvedValue([]);

    await expect(equipCompanionToBook('non-existent', 'companion-1', 0)).rejects.toThrow(
      'Book not found: non-existent'
    );
  });

  it('throws error when slot is locked', async () => {
    const book: Partial<Book> = {
      id: 'book-1',
      loadout: { slots: [null, null, null], unlockedSlots: 1 },
    };
    (storage.getBooks as jest.Mock).mockResolvedValue([book]);

    await expect(equipCompanionToBook('book-1', 'companion-1', 1)).rejects.toThrow(
      'Slot 2 is locked'
    );
  });
});

describe('unequipCompanionFromBook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unequips companion from book and saves', async () => {
    const book: Partial<Book> = {
      id: 'book-1',
      title: 'Test Book',
      loadout: { slots: ['companion-1', null, null], unlockedSlots: 2 },
    };
    (storage.getBooks as jest.Mock).mockResolvedValue([book]);
    (storage.saveBook as jest.Mock).mockResolvedValue(undefined);

    const result = await unequipCompanionFromBook('book-1', 0);

    expect(result.loadout?.slots[0]).toBeNull();
    expect(storage.saveBook).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'book-1',
        loadout: { slots: [null, null, null], unlockedSlots: 2 },
      })
    );
  });

  it('throws error when book not found', async () => {
    (storage.getBooks as jest.Mock).mockResolvedValue([]);

    await expect(unequipCompanionFromBook('non-existent', 0)).rejects.toThrow(
      'Book not found: non-existent'
    );
  });
});

describe('getBookEquippedCompanionIds', () => {
  it('returns equipped companion IDs from book loadout', () => {
    const book: Partial<Book> = {
      id: 'book-1',
      loadout: { slots: ['comp-1', null, 'comp-3'], unlockedSlots: 3 },
    };
    const ids = getBookEquippedCompanionIds(book as Book);
    expect(ids).toEqual(['comp-1', 'comp-3']);
  });

  it('returns empty array when book has no loadout', () => {
    const book: Partial<Book> = {
      id: 'book-1',
    };
    const ids = getBookEquippedCompanionIds(book as Book);
    expect(ids).toEqual([]);
  });
});
