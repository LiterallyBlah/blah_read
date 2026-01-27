export type BookStatus = 'to_read' | 'reading' | 'finished';

export type CompanionRarity = 'common' | 'rare' | 'legendary';
export type CompanionType = 'character' | 'creature' | 'object';
export type CompanionSource = 'discovered' | 'inspired';
export type CompanionUnlockMethod = 'reading_time' | 'loot_box' | 'book_completion';

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
  companions?: BookCompanions;
  companionsPending?: boolean;
  // Legacy field for migration
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
  name: string;
  type: CompanionType;
  rarity: CompanionRarity;
  description: string;
  traits: string;
  visualDescription: string;
  physicalDescription?: string; // New field - used by new companions
  imageUrl: string | null;
  source: CompanionSource;
  unlockMethod: CompanionUnlockMethod | null;
  unlockedAt: number | null;
  // Legacy fields for migration
  archetype?: string;
  creature?: string;
  keywords?: string[];
  generatedAt?: number;
}

export interface CompanionQueue {
  companions: Companion[];
  nextGenerateIndex: number;
}

export interface BookCompanions {
  researchComplete: boolean;
  researchConfidence: 'high' | 'medium' | 'low';
  readingTimeQueue: CompanionQueue;
  poolQueue: CompanionQueue;
  unlockedCompanions: Companion[];
}

export interface LootBox {
  id: string;
  earnedAt: number;
  source: string; // e.g., "streak_7", "xp_250", "book_finished"
}

export interface LootBoxState {
  availableBoxes: LootBox[];
  openHistory: Array<{
    boxId: string;
    openedAt: number;
    companionId: string;
  }>;
}

export interface UserProgress {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null; // YYYY-MM-DD
  lootItems: LootItem[];
  lootBoxes: LootBoxState;
  // Achievement tracking for loot box rewards
  booksFinished: number;
  booksAdded: number;
  totalHoursRead: number;
}

export interface LootItem {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: number;
}
