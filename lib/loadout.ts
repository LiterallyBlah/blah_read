import { CompanionLoadout, Book } from './types';
import { storage } from './storage';
import { debug } from './debug';

/**
 * Creates a default loadout with 3 empty slots and 1 unlocked slot.
 */
export function createDefaultLoadout(): CompanionLoadout {
  debug.log('loadout', 'Creating default loadout');
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
  debug.log('loadout', 'equipCompanion called', {
    companionId,
    slotIndex,
    currentSlots: loadout.slots,
    unlockedSlots: loadout.unlockedSlots,
  });

  if (slotIndex < 0 || slotIndex >= 3) {
    debug.error('loadout', `Invalid slot index: ${slotIndex}`);
    throw new Error(`Invalid slot index: ${slotIndex}`);
  }
  if (slotIndex >= loadout.unlockedSlots) {
    debug.error('loadout', `Slot ${slotIndex + 1} is locked`);
    throw new Error(`Slot ${slotIndex + 1} is locked`);
  }
  const newSlots = [...loadout.slots];
  const previousOccupant = newSlots[slotIndex];
  newSlots[slotIndex] = companionId;

  debug.log('loadout', 'Companion equipped successfully', {
    slot: slotIndex + 1,
    companionId,
    previousOccupant,
    newSlots,
  });

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
  debug.log('loadout', 'unequipCompanion called', {
    slotIndex,
    currentSlots: loadout.slots,
  });

  if (slotIndex < 0 || slotIndex >= 3) {
    debug.error('loadout', `Invalid slot index: ${slotIndex}`);
    throw new Error(`Invalid slot index: ${slotIndex}`);
  }
  const newSlots = [...loadout.slots];
  const removedCompanion = newSlots[slotIndex];
  newSlots[slotIndex] = null;

  debug.log('loadout', 'Companion unequipped successfully', {
    slot: slotIndex + 1,
    removedCompanion,
    newSlots,
  });

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

// ============================================
// Per-Book Loadout Functions
// ============================================

/**
 * Get a book's loadout, falling back to a default if not set.
 */
export function getBookLoadout(book: Book): CompanionLoadout {
  if (book.loadout) {
    return book.loadout;
  }
  // Fallback for books without loadout (pre-migration)
  return createDefaultLoadout();
}

/**
 * Equips a companion to a specific book's loadout slot and persists the change.
 * @param bookId - The book to update
 * @param companionId - The companion to equip
 * @param slotIndex - The slot to equip to (0-2)
 * @returns The updated book
 * @throws Error if book not found, slot index invalid, or slot locked
 */
export async function equipCompanionToBook(
  bookId: string,
  companionId: string,
  slotIndex: number
): Promise<Book> {
  debug.log('loadout', 'equipCompanionToBook called', { bookId, companionId, slotIndex });

  const books = await storage.getBooks();
  const book = books.find(b => b.id === bookId);
  if (!book) {
    throw new Error(`Book not found: ${bookId}`);
  }

  const currentLoadout = getBookLoadout(book);
  const newLoadout = equipCompanion(currentLoadout, companionId, slotIndex);

  const updatedBook = { ...book, loadout: newLoadout };
  await storage.saveBook(updatedBook);

  debug.log('loadout', 'equipCompanionToBook complete', {
    bookId,
    companionId,
    slotIndex,
    newSlots: newLoadout.slots,
  });

  return updatedBook;
}

/**
 * Unequips a companion from a specific book's loadout slot and persists the change.
 * @param bookId - The book to update
 * @param slotIndex - The slot to clear (0-2)
 * @returns The updated book
 * @throws Error if book not found or slot index invalid
 */
export async function unequipCompanionFromBook(
  bookId: string,
  slotIndex: number
): Promise<Book> {
  debug.log('loadout', 'unequipCompanionFromBook called', { bookId, slotIndex });

  const books = await storage.getBooks();
  const book = books.find(b => b.id === bookId);
  if (!book) {
    throw new Error(`Book not found: ${bookId}`);
  }

  const currentLoadout = getBookLoadout(book);
  const newLoadout = unequipCompanion(currentLoadout, slotIndex);

  const updatedBook = { ...book, loadout: newLoadout };
  await storage.saveBook(updatedBook);

  debug.log('loadout', 'unequipCompanionFromBook complete', {
    bookId,
    slotIndex,
    newSlots: newLoadout.slots,
  });

  return updatedBook;
}

/**
 * Get the equipped companion IDs for a specific book.
 */
export function getBookEquippedCompanionIds(book: Book): string[] {
  const loadout = getBookLoadout(book);
  return getEquippedCompanionIds(loadout);
}
