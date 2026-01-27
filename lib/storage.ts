import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book, ReadingSession, UserProgress } from './types';

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
};

export const storage = {
  async getBooks(): Promise<Book[]> {
    const data = await AsyncStorage.getItem(KEYS.BOOKS);
    return data ? JSON.parse(data) : [];
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
    return data ? JSON.parse(data) : defaultProgress;
  },

  async saveProgress(progress: UserProgress): Promise<void> {
    await AsyncStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress));
  },
};
