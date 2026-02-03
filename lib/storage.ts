import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book, ReadingSession, UserProgress, Companion, CompanionLoadout } from './types';
import { migrateData, CURRENT_VERSION } from './migrations';
import { debug } from './debug';
import { deleteCompanionImage } from './imageStorage';

/**
 * Safely parse JSON with fallback.
 * Prevents crashes from corrupted AsyncStorage data.
 */
function safeJsonParse<T>(data: string | null, defaultValue: T, context: string): T {
  if (!data) return defaultValue;
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error(`[storage] JSON parse failed (${context}):`, error);
    debug.error('storage', `JSON parse failed (${context})`, error);
    return defaultValue;
  }
}

// Mutex for saveBook to prevent race conditions
let saveBookLock: Promise<void> | null = null;

export interface DuplicateQuery {
  asin?: string;
  title?: string;
  authors?: string[];
}

const KEYS = {
  BOOKS: 'blahread:books',
  SESSIONS: 'blahread:sessions',
  PROGRESS: 'blahread:progress',
  LAST_ACTIVE_BOOK: 'blahread:lastActiveBookId',
} as const;

const defaultProgress: UserProgress = {
  totalXp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastReadDate: null,
  lootItems: [],
  lootBoxes: {
    availableBoxes: [],
    openHistory: [],
  },
  booksFinished: 0,
  booksAdded: 0,
  totalHoursRead: 0,
  genreLevels: {
    'fantasy': 0,
    'sci-fi': 0,
    'mystery-thriller': 0,
    'horror': 0,
    'romance': 0,
    'literary-fiction': 0,
    'history': 0,
    'biography-memoir': 0,
    'science-nature': 0,
    'self-improvement': 0,
    'business-finance': 0,
    'philosophy-religion': 0,
  },
  slotProgress: {
    slot2Points: 0,
    slot3Points: 0,
    booksFinished: 0,
    hoursLogged: 0,
    companionsCollected: 0,
    sessionsCompleted: 0,
    genreLevelTens: [],
    genresRead: [],
  },
  activeConsumables: [],
  lootBoxesV3: [],
  streakShieldExpiry: null,
  pendingBoxUpgrade: false,
  pendingGuaranteedCompanion: false,
  pendingInstantLevels: 0,
};

// Track if migration has run this session
let migrationComplete = false;

// Check if error is a "Row too big" error from AsyncStorage
function isRowTooBigError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Row too big') ||
           error.message.includes('CursorWindow');
  }
  return false;
}

export const storage = {
  async getBooks(): Promise<Book[]> {
    debug.log('storage', 'getBooks called');
    let data: string | null;
    try {
      data = await AsyncStorage.getItem(KEYS.BOOKS);
      debug.log('storage', `Raw data loaded: ${data ? data.length : 0} bytes`);
    } catch (error) {
      if (isRowTooBigError(error)) {
        debug.error('storage', 'Books data corrupted (too large). Clearing...');
        console.error('[storage] Books data corrupted (too large). Clearing...');
        await AsyncStorage.removeItem(KEYS.BOOKS);
        return [];
      }
      throw error;
    }
    const books = safeJsonParse<Book[]>(data, [], 'getBooks');
    debug.log('storage', `Parsed ${books.length} books`);

    // Log companion counts for each book
    for (const book of books) {
      if (book.companions) {
        debug.log('storage', `Book "${book.title}" companions`, {
          unlockedCount: book.companions.unlockedCompanions?.length || 0,
          unlockedWithImages: (book.companions.unlockedCompanions || []).filter((c: any) => c.imageUrl).length,
          rtCount: book.companions.readingTimeQueue?.companions?.length || 0,
          rtWithImages: (book.companions.readingTimeQueue?.companions || []).filter((c: any) => c.imageUrl).length,
          poolCount: book.companions.poolQueue?.companions?.length || 0,
          poolWithImages: (book.companions.poolQueue?.companions || []).filter((c: any) => c.imageUrl).length,
          poolAvailable: (book.companions.poolQueue?.companions || []).filter((c: any) => c.imageUrl && c.unlockMethod === null).length,
        });
      }
    }

    if (!migrationComplete) {
      debug.log('storage', 'Checking for migration...');
      const progressData = await AsyncStorage.getItem(KEYS.PROGRESS);
      const parsedProgress = safeJsonParse<UserProgress & { version?: number }>(
        progressData,
        { ...defaultProgress, version: undefined },
        'migration-progress'
      );

      if (!parsedProgress.version || parsedProgress.version < CURRENT_VERSION) {
        debug.log('storage', `Migration needed: ${parsedProgress.version || 'none'} -> ${CURRENT_VERSION}`);
        const migrated = await migrateData(books, parsedProgress);
        await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(migrated.books));
        await AsyncStorage.setItem(KEYS.PROGRESS, JSON.stringify(migrated.progress));
        migrationComplete = true;
        return migrated.books;
      }

      migrationComplete = true;
    }

    return books;
  },

  async saveBook(book: Book): Promise<void> {
    // Wait for any pending save to complete (mutex pattern)
    if (saveBookLock) {
      await saveBookLock;
    }

    let unlock: () => void;
    saveBookLock = new Promise<void>(resolve => {
      unlock = resolve;
    });

    try {
      debug.log('storage', 'saveBook called', {
        bookId: book.id,
        title: book.title,
        hasCompanions: !!book.companions,
      });

      if (book.companions) {
        debug.log('storage', 'Book companions state', {
          unlockedCount: book.companions.unlockedCompanions.length,
          unlockedWithImages: book.companions.unlockedCompanions.filter(c => c.imageUrl).length,
          readingTimeQueueCount: book.companions.readingTimeQueue.companions.length,
          rtWithImages: book.companions.readingTimeQueue.companions.filter(c => c.imageUrl).length,
          poolQueueCount: book.companions.poolQueue.companions.length,
          poolWithImages: book.companions.poolQueue.companions.filter(c => c.imageUrl).length,
          poolAvailable: book.companions.poolQueue.companions.filter(c => c.imageUrl && c.unlockMethod === null).length,
        });
      }

      const books = await this.getBooks();
      const index = books.findIndex(b => b.id === book.id);
      if (index >= 0) {
        debug.log('storage', `Updating existing book at index ${index}`);
        books[index] = book;
      } else {
        debug.log('storage', 'Adding new book');
        books.push(book);
      }

      const json = JSON.stringify(books);
      debug.log('storage', `Saving ${books.length} books (${json.length} bytes)`);
      await AsyncStorage.setItem(KEYS.BOOKS, json);
      debug.log('storage', 'saveBook complete');
    } finally {
      unlock!();
      saveBookLock = null;
    }
  },

  async deleteBook(id: string): Promise<void> {
    const books = await this.getBooks();
    const book = books.find(b => b.id === id);

    if (book) {
      // Collect all companion IDs from this book
      const companionIds: string[] = [];

      if (book.companions) {
        const collectCompanions = (companions: Companion[]) => {
          for (const c of companions) {
            companionIds.push(c.id);
          }
        };

        collectCompanions(book.companions.unlockedCompanions || []);
        collectCompanions(book.companions.readingTimeQueue?.companions || []);
        collectCompanions(book.companions.poolQueue?.companions || []);

        if (book.companions.completionLegendary) {
          companionIds.push(book.companions.completionLegendary.id);
        }
        if (book.companions.poolLegendary) {
          companionIds.push(book.companions.poolLegendary.id);
        }
      }

      // Delete companion images (try common extensions)
      for (const companionId of companionIds) {
        for (const ext of ['png', 'jpeg', 'jpg', 'webp']) {
          await deleteCompanionImage(`${companionId}.${ext}`);
        }
      }

      // Clean up loadout references in other books that may reference these companions
      const otherBooks = books.filter(b => b.id !== id);
      let updatedBookCount = 0;
      for (const otherBook of otherBooks) {
        if (otherBook.loadout) {
          const cleanedSlots = otherBook.loadout.slots.map(slot =>
            slot && companionIds.includes(slot) ? null : slot
          ) as [string | null, string | null, string | null];
          const hasOrphanedSlots = cleanedSlots.some((s, i) => s !== otherBook.loadout!.slots[i]);
          if (hasOrphanedSlots) {
            otherBook.loadout.slots = cleanedSlots;
            updatedBookCount++;
          }
        }
      }
      if (updatedBookCount > 0) {
        debug.log('storage', `Cleaned up orphaned loadout references in ${updatedBookCount} books`);
      }

      debug.log('storage', `Deleted book ${id} with ${companionIds.length} companions`);
    }

    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(books.filter(b => b.id !== id)));
  },

  async getSessions(): Promise<ReadingSession[]> {
    const data = await AsyncStorage.getItem(KEYS.SESSIONS);
    return safeJsonParse<ReadingSession[]>(data, [], 'getSessions');
  },

  async saveSession(session: ReadingSession): Promise<void> {
    let sessions = await this.getSessions();
    sessions.push(session);

    // Prune old sessions to prevent unbounded growth (keep last 1000)
    const MAX_SESSIONS = 1000;
    if (sessions.length > MAX_SESSIONS) {
      sessions = sessions.slice(-MAX_SESSIONS);
    }

    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
  },

  async getProgress(): Promise<UserProgress> {
    const data = await AsyncStorage.getItem(KEYS.PROGRESS);
    const progress = safeJsonParse<UserProgress>(data, defaultProgress, 'getProgress');

    // Ensure all required fields exist (defensive)
    return {
      ...defaultProgress,
      ...progress,
    };
  },

  async saveProgress(progress: UserProgress): Promise<void> {
    await AsyncStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress));
  },

  /**
   * Update a book's loadout.
   * @param bookId - The book ID to update
   * @param loadout - The new loadout to set
   */
  async updateBookLoadout(bookId: string, loadout: CompanionLoadout): Promise<void> {
    const books = await this.getBooks();
    const book = books.find(b => b.id === bookId);
    if (!book) {
      throw new Error(`Book not found: ${bookId}`);
    }

    book.loadout = loadout;
    await this.saveBook(book);
    debug.log('storage', `Updated loadout for book ${bookId}`, loadout);
  },

  /**
   * Get the default loadout for a new book.
   * Uses the user's unlocked slot count (from slotProgress) but with empty slots.
   */
  async getDefaultLoadoutForNewBook(): Promise<CompanionLoadout> {
    const progress = await this.getProgress();
    // Determine unlocked slots from slot progress
    const slotProgress = progress.slotProgress;
    let unlockedSlots: 1 | 2 | 3 = 1;
    if (slotProgress) {
      if (slotProgress.slot2Points >= 100) {
        unlockedSlots = 2;
      }
      if (unlockedSlots >= 2 && slotProgress.slot3Points >= 300) {
        unlockedSlots = 3;
      }
    }
    return {
      slots: [null, null, null],
      unlockedSlots,
    };
  },

  /**
   * Get the last active book ID (for home screen card deck persistence).
   */
  async getLastActiveBookId(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.LAST_ACTIVE_BOOK);
  },

  /**
   * Set the last active book ID (called when starting a reading session).
   */
  async setLastActiveBookId(bookId: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.LAST_ACTIVE_BOOK, bookId);
  },

  async findDuplicateBook(query: DuplicateQuery): Promise<Book | null> {
    const books = await this.getBooks();

    // Check ASIN first (exact match)
    if (query.asin) {
      const asinMatch = books.find(b => b.asin === query.asin);
      if (asinMatch) return asinMatch;
    }

    // Check title + author (fuzzy match)
    if (query.title) {
      const normalizedTitle = query.title.toLowerCase().trim();
      const queryAuthor = query.authors?.[0]?.toLowerCase().trim();

      const titleMatch = books.find(b => {
        const bookTitle = b.title.toLowerCase().trim();
        const bookAuthor = b.authors?.[0]?.toLowerCase().trim();

        // Title must match
        if (bookTitle !== normalizedTitle) return false;

        // If we have author info, it should match too
        if (queryAuthor && bookAuthor) {
          return bookAuthor.includes(queryAuthor) || queryAuthor.includes(bookAuthor);
        }

        return true;
      });

      if (titleMatch) return titleMatch;
    }

    return null;
  },
};
