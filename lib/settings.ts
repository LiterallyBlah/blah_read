import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from './storage';
import { clearAllImages, deleteBookImages } from './imageStorage';

const SETTINGS_KEY = 'blahread:settings';

export interface Settings {
  // API - OpenRouter
  apiKey: string | null;
  llmModel: string;
  imageModel: string;
  // API - Book Enrichment
  googleBooksApiKey: string | null;
  // Goals
  dailyTarget: number;
  reminderEnabled: boolean;
  reminderTime: string;
  // Display
  theme: 'auto' | 'dark' | 'light';
  fontScale: 0.85 | 1 | 1.2;
  // Debug
  debugMode: boolean;
}

export const defaultSettings: Settings = {
  apiKey: null,
  llmModel: 'google/gemini-2.5-flash-preview-05-20',
  imageModel: 'bytedance-seed/seedream-4.5',
  googleBooksApiKey: null,
  dailyTarget: 30,
  reminderEnabled: false,
  reminderTime: '20:00',
  theme: 'auto',
  fontScale: 1,
  debugMode: false,
};

export const settings = {
  async get(): Promise<Settings> {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
  },

  async set(partial: Partial<Settings>): Promise<void> {
    const current = await this.get();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...partial }));
  },
};

export async function exportAllData(): Promise<string> {
  const [books, sessions, progress, settingsData] = await Promise.all([
    storage.getBooks(),
    storage.getSessions(),
    storage.getProgress(),
    settings.get(),
  ]);
  return JSON.stringify({ books, sessions, progress, settings: settingsData }, null, 2);
}

export async function clearProgress(): Promise<void> {
  await storage.saveProgress({
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    lootItems: [],
    lootBoxes: { availableBoxes: [], openHistory: [] },
    booksFinished: 0,
    booksAdded: 0,
    totalHoursRead: 0,
  });
}

export interface DeleteOptions {
  books: boolean;
  companionsOnly: boolean; // Clear companions but keep books
  sessions: boolean;
  progress: boolean;
  settings: boolean;
}

export async function selectiveDelete(options: DeleteOptions): Promise<void> {
  const keysToRemove: string[] = [];

  if (options.books) {
    keysToRemove.push('blahread:books');
    // Also delete all companion images
    await clearAllImages();
  } else if (options.companionsOnly) {
    // Clear companions from all books but keep the books
    const books = await storage.getBooks();

    // Delete images for each book
    for (const book of books) {
      await deleteBookImages(book.id);
    }

    const clearedBooks = books.map(book => ({
      ...book,
      companions: undefined,
      companion: undefined, // Legacy field
      totalReadingTime: 0, // Reset reading time since companions are tied to it
    }));
    await AsyncStorage.setItem('blahread:books', JSON.stringify(clearedBooks));
  }

  if (options.sessions) {
    keysToRemove.push('blahread:sessions');
  }

  if (options.progress) {
    await clearProgress();
  }

  if (options.settings) {
    keysToRemove.push('blahread:settings');
  }

  if (keysToRemove.length > 0) {
    await AsyncStorage.multiRemove(keysToRemove);
  }
}

export async function resetApp(): Promise<void> {
  // Clear all companion images from file system
  await clearAllImages();

  // Clear all AsyncStorage data
  await AsyncStorage.multiRemove([
    'blahread:books',
    'blahread:sessions',
    'blahread:progress',
    'blahread:settings',
  ]);
}
