import type { Book, UserProgress, Companion, GenreLevels, CompanionLoadout, SlotUnlockProgress } from './types';
import { GENRES, Genre, mapToCanonicalGenres } from './genres';

export const CURRENT_VERSION = 4;

// Default values for V3 fields
const DEFAULT_GENRE_LEVELS: GenreLevels = GENRES.reduce((acc, genre) => {
  acc[genre] = 0;
  return acc;
}, {} as GenreLevels);

const DEFAULT_LOADOUT: CompanionLoadout = {
  slots: [null, null, null],
  unlockedSlots: 1,
};

const DEFAULT_SLOT_PROGRESS: SlotUnlockProgress = {
  slot2Points: 0,
  slot3Points: 0,
  booksFinished: 0,
  hoursLogged: 0,
  companionsCollected: 0,
  sessionsCompleted: 0,
  genreLevelTens: [],
  genresRead: [],
};

export async function migrateData(
  books: Book[],
  progress: UserProgress & { version?: number }
): Promise<{ books: Book[]; progress: UserProgress & { version: number } }> {
  let version = progress.version || 1;
  let migratedBooks = books;
  let migratedProgress = progress;

  // Migration v1 -> v2: Add companion collection fields
  if (version < 2) {
    migratedBooks = books.map(book => {
      // @ts-ignore - accessing legacy companion field
      if (book.companion && !book.companions) {
        // @ts-ignore - legacy companion structure
        const legacy = book.companion;

        const legacyCompanion: Companion = {
          id: legacy.id || `${book.id}-legacy-companion`,
          bookId: book.id,
          name: legacy.creature || 'Companion',
          type: 'creature',
          rarity: 'legendary',
          description: `A ${legacy.archetype || 'mysterious'} companion`,
          traits: legacy.keywords?.join(', ') || '',
          visualDescription: legacy.keywords?.join(', ') || '',
          imageUrl: legacy.imageUrl || null,
          source: 'inspired',
          unlockMethod: 'reading_time',
          unlockedAt: legacy.generatedAt || Date.now(),
        };

        return {
          ...book,
          companions: {
            researchComplete: true,
            researchConfidence: 'low' as const,
            readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
            poolQueue: { companions: [], nextGenerateIndex: 0 },
            unlockedCompanions: [legacyCompanion],
          },
        };
      }
      return book;
    });

    // Add loot box state to progress if missing
    migratedProgress = {
      ...migratedProgress,
      lootBoxes: migratedProgress.lootBoxes || { availableBoxes: [], openHistory: [] },
      booksFinished: migratedProgress.booksFinished ?? 0,
      booksAdded: migratedProgress.booksAdded ?? migratedBooks.length,
      totalHoursRead: migratedProgress.totalHoursRead ?? 0,
    };

    version = 2;
  }

  // Migration v2 -> v3: Add Reward System V3 fields
  if (version < 3) {
    // Migrate books: add normalizedGenres and progression
    migratedBooks = migratedBooks.map(book => {
      const updates: Partial<Book> = {};

      // Add normalized genres from existing genres field
      if (!book.normalizedGenres && book.genres && book.genres.length > 0) {
        updates.normalizedGenres = mapToCanonicalGenres(book.genres);
      } else if (!book.normalizedGenres) {
        updates.normalizedGenres = [];
      }

      // Add book progression based on existing reading time
      if (!book.progression) {
        const totalSeconds = book.totalReadingTime || 0;
        const level = Math.floor(totalSeconds / 3600); // 1 level per hour
        updates.progression = {
          level,
          totalSeconds,
          levelUps: [], // Historical level ups not tracked
        };
      }

      return { ...book, ...updates };
    });

    // Calculate initial genre levels from book reading time
    const genreLevels: GenreLevels = { ...DEFAULT_GENRE_LEVELS };
    for (const book of migratedBooks) {
      if (book.normalizedGenres && book.progression) {
        for (const genre of book.normalizedGenres) {
          // Add book's level to genre level
          genreLevels[genre] = (genreLevels[genre] || 0) + book.progression.level;
        }
      }
    }

    // Calculate slot progress from existing data
    const slotProgress: SlotUnlockProgress = {
      ...DEFAULT_SLOT_PROGRESS,
      booksFinished: migratedProgress.booksFinished || 0,
      hoursLogged: Math.floor((migratedProgress.totalHoursRead || 0)),
      companionsCollected: migratedBooks.reduce((count, book) => {
        return count + (book.companions?.unlockedCompanions?.length || 0);
      }, 0),
      sessionsCompleted: 0, // Not tracked in v2
      genreLevelTens: Object.entries(genreLevels)
        .filter(([_, level]) => level >= 10)
        .map(([genre]) => genre),
      genresRead: [...new Set(migratedBooks.flatMap(book => book.normalizedGenres || []))],
    };

    // Determine how many slots should be unlocked based on progress
    let unlockedSlots = 1;
    const slot2Points =
      Math.min(slotProgress.booksFinished, 1) * 50 + // First book finished
      slotProgress.hoursLogged * 15 + // Hours logged
      slotProgress.companionsCollected * 20; // Companions collected
      // Sessions removed from slot 2 - use cumulative hours instead

    const slot3Points =
      slotProgress.booksFinished * 40 +
      slotProgress.hoursLogged * 10 +
      slotProgress.companionsCollected * 15 +
      slotProgress.genreLevelTens.length * 50 +
      slotProgress.genresRead.length * 30;

    if (slot2Points >= 100) {
      unlockedSlots = 2;
    }
    if (slot3Points >= 300 && unlockedSlots >= 2) {
      unlockedSlots = 3;
    }

    slotProgress.slot2Points = slot2Points;
    slotProgress.slot3Points = slot3Points;

    // Migrate progress: add V3 fields
    migratedProgress = {
      ...migratedProgress,
      genreLevels: migratedProgress.genreLevels || genreLevels,
      loadout: migratedProgress.loadout || {
        ...DEFAULT_LOADOUT,
        unlockedSlots: unlockedSlots as 1 | 2 | 3,
      },
      slotProgress: migratedProgress.slotProgress || slotProgress,
      activeConsumables: migratedProgress.activeConsumables || [],
      lootBoxesV3: migratedProgress.lootBoxesV3 || [],
    };

    version = 3;
  }

  // Migration v3 -> v4: Per-book loadouts
  if (version < 4) {
    // Get the global loadout (default if not present)
    const globalLoadout = migratedProgress.loadout || DEFAULT_LOADOUT;

    // Find the current "reading" book, or most recently created reading book
    const readingBooks = migratedBooks
      .filter(b => b.status === 'reading')
      .sort((a, b) => b.createdAt - a.createdAt);
    const activeBook = readingBooks[0];

    // Migrate books: add per-book loadouts
    migratedBooks = migratedBooks.map(book => {
      // Skip if book already has a loadout
      if (book.loadout) return book;

      // Active reading book gets the global loadout
      // Other books get empty slots but same unlocked count
      const loadout = book.id === activeBook?.id
        ? { ...globalLoadout }
        : {
            slots: [null, null, null] as [string | null, string | null, string | null],
            unlockedSlots: globalLoadout.unlockedSlots,
          };

      return { ...book, loadout };
    });

    version = 4;
  }

  return {
    books: migratedBooks,
    progress: { ...migratedProgress, version },
  };
}
