import { SlotUnlockProgress } from './types';

// Points required to unlock each slot
export const SLOT_2_POINTS = 100;
export const SLOT_3_POINTS = 300;

// Slot 2 point values (exported for UI breakdown)
export const SLOT_2_BOOK_FINISHED = 50;
export const SLOT_2_HOUR_LOGGED = 15;
export const SLOT_2_COMPANION_COLLECTED = 20;
// Sessions removed from slot 2 - use cumulative hours instead

// Slot 3 point values (exported for UI breakdown)
export const SLOT_3_BOOK_FINISHED = 40;
export const SLOT_3_HOUR_LOGGED = 10;
export const SLOT_3_COMPANION_COLLECTED = 15;
export const SLOT_3_GENRE_LEVEL_TEN = 50;
export const SLOT_3_NEW_GENRE = 30;

/**
 * Creates a default SlotUnlockProgress with all values at zero/empty.
 */
export function createDefaultSlotProgress(): SlotUnlockProgress {
  return {
    slot2Points: 0,
    slot3Points: 0,
    booksFinished: 0,
    hoursLogged: 0,
    companionsCollected: 0,
    sessionsCompleted: 0,
    genreLevelTens: [],
    genresRead: [],
  };
}

/**
 * Calculates points toward unlocking slot 2.
 * Note: Only the first book finished counts for slot 2.
 */
export function calculateSlot2Progress(progress: SlotUnlockProgress): number {
  // Only first book counts for slot 2
  const booksPoints = Math.min(progress.booksFinished, 1) * SLOT_2_BOOK_FINISHED;
  const hoursPoints = progress.hoursLogged * SLOT_2_HOUR_LOGGED;
  const companionsPoints = progress.companionsCollected * SLOT_2_COMPANION_COLLECTED;
  // Sessions removed - use cumulative hours instead

  return booksPoints + hoursPoints + companionsPoints;
}

/**
 * Calculates points toward unlocking slot 3.
 * Slot 3 can count all books, hours, etc. plus genre-specific milestones.
 */
export function calculateSlot3Progress(progress: SlotUnlockProgress): number {
  const booksPoints = progress.booksFinished * SLOT_3_BOOK_FINISHED;
  const hoursPoints = progress.hoursLogged * SLOT_3_HOUR_LOGGED;
  const companionsPoints = progress.companionsCollected * SLOT_3_COMPANION_COLLECTED;
  const genreLevelTensPoints = progress.genreLevelTens.length * SLOT_3_GENRE_LEVEL_TEN;
  const genresReadPoints = progress.genresRead.length * SLOT_3_NEW_GENRE;

  return booksPoints + hoursPoints + companionsPoints + genreLevelTensPoints + genresReadPoints;
}

/**
 * Returns true if the player has earned enough points to unlock slot 2.
 */
export function shouldUnlockSlot2(progress: SlotUnlockProgress): boolean {
  return calculateSlot2Progress(progress) >= SLOT_2_POINTS;
}

/**
 * Returns true if the player has earned enough points to unlock slot 3.
 */
export function shouldUnlockSlot3(progress: SlotUnlockProgress): boolean {
  return calculateSlot3Progress(progress) >= SLOT_3_POINTS;
}
