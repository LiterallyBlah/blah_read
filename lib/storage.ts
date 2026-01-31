import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book, ReadingSession, UserProgress, Companion } from './types';
import { migrateData, CURRENT_VERSION } from './migrations';
import { debug } from './debug';
import { deleteCompanionImage } from './imageStorage';

export interface DuplicateQuery {
  asin?: string;
  title?: string;
  authors?: string[];
}

const KEYS = {
  BOOKS: 'blahread:books',
  SESSIONS: 'blahread:sessions',
  PROGRESS: 'blahread:progress',
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
  loadout: {
    slots: [null, null, null],
    unlockedSlots: 1,
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
    const books = data ? JSON.parse(data) : [];
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
      const parsedProgress = progressData ? JSON.parse(progressData) : defaultProgress;

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

      // Clean up loadout references
      const progress = await this.getProgress();
      if (progress.loadout) {
        const cleanedSlots = progress.loadout.slots.map(slot =>
          slot && companionIds.includes(slot) ? null : slot
        );
        const hasOrphanedSlots = cleanedSlots.some((s, i) => s !== progress.loadout!.slots[i]);
        if (hasOrphanedSlots) {
          progress.loadout.slots = cleanedSlots;
          await this.saveProgress(progress);
          debug.log('storage', `Cleaned up ${companionIds.length} orphaned loadout references`);
        }
      }

      debug.log('storage', `Deleted book ${id} with ${companionIds.length} companions`);
    }

    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(books.filter(b => b.id !== id)));
  },

  async getSessions(): Promise<ReadingSession[]> {
    const data = await AsyncStorage.getItem(KEYS.SESSIONS);
    return data ? JSON.parse(data) : [];
  },

  async saveSession(session: ReadingSession): Promise<void> {
    const sessions = await this.getSessions();
    sessions.push(session);
    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
  },

  async getProgress(): Promise<UserProgress> {
    const data = await AsyncStorage.getItem(KEYS.PROGRESS);
    const progress = data ? JSON.parse(data) : defaultProgress;

    // Ensure all required fields exist (defensive)
    return {
      ...defaultProgress,
      ...progress,
    };
  },

  async saveProgress(progress: UserProgress): Promise<void> {
    await AsyncStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress));
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
