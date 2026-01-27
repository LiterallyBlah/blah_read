export type BookStatus = 'to_read' | 'reading' | 'finished';

export interface Book {
  id: string;
  title: string;
  coverUrl: string | null;
  synopsis: string | null;
  sourceUrl: string | null;
  status: BookStatus;
  totalReadingTime: number; // in seconds
  createdAt: number;
  finishedAt?: number;
  companion?: Companion;
  // Kindle share & metadata enrichment fields
  authors?: string[];
  asin?: string;
  pageCount?: number | null;
  genres?: string[];
  publisher?: string | null;
  publishedDate?: string | null;
  source?: 'kindle-share' | 'manual' | 'url';
  metadataSynced?: boolean;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  xpEarned: number;
}

export interface Companion {
  id: string;
  bookId: string;
  imageUrl: string;
  archetype: string;
  creature: string;
  keywords: string[];
  generatedAt: number;
}

export interface UserProgress {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null; // YYYY-MM-DD
  lootItems: LootItem[];
}

export interface LootItem {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: number;
}
