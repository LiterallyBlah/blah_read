import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from './storage';

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

export async function resetApp(): Promise<void> {
  await AsyncStorage.multiRemove([
    'blahread:books',
    'blahread:sessions',
    'blahread:progress',
    'blahread:settings',
  ]);
}
