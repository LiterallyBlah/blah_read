import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book, ReadingSession, UserProgress } from './types';
import { migrateData, CURRENT_VERSION } from './migrations';

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
    let data: string | null;
    try {
      data = await AsyncStorage.getItem(KEYS.BOOKS);
    } catch (error) {
      if (isRowTooBigError(error)) {
        console.error('[storage] Books data corrupted (too large). Clearing...');
        await AsyncStorage.removeItem(KEYS.BOOKS);
        return [];
      }
      throw error;
    }
    const books = data ? JSON.parse(data) : [];

    if (!migrationComplete) {
      const progressData = await AsyncStorage.getItem(KEYS.PROGRESS);
      const parsedProgress = progressData ? JSON.parse(progressData) : defaultProgress;

      if (!parsedProgress.version || parsedProgress.version < CURRENT_VERSION) {
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
    const books = await this.getBooks();
    const index = books.findIndex(b => b.id === book.id);
    if (index >= 0) {
      books[index] = book;
    } else {
      books.push(book);
    }
    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(books));
  },

  async deleteBook(id: string): Promise<void> {
    const books = await this.getBooks();
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
