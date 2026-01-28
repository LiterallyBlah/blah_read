import { Genre } from './genres';
import { CompanionEffect } from './companionEffects';

export type BookStatus = 'to_read' | 'reading' | 'finished';

export type CompanionRarity = 'common' | 'rare' | 'legendary';
export type CompanionType = 'character' | 'creature' | 'object';
export type CompanionSource = 'discovered' | 'inspired';
export type CompanionUnlockMethod = 'reading_time' | 'loot_box' | 'book_completion';

// Book level tracking
export interface BookProgression {
  level: number;
  totalSeconds: number; // Reading time for this book
  levelUps: number[]; // Timestamps of level ups (for loot tracking)
}

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
  // Reward System V3 fields
  normalizedGenres?: Genre[]; // Normalized genres for reward system
  progression?: BookProgression; // Book-specific progression
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
  // Reward System V3 fields
  effects?: CompanionEffect[]; // Companion effects
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
  // Book-specific legendary companions
  completionLegendary?: Companion | null; // Awarded when user finishes the book
  poolLegendary?: Companion | null; // Can be won from gold loot boxes
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

// Active consumable effect
export interface ActiveConsumable {
  consumableId: string;
  remainingDuration: number; // Minutes remaining
  appliedAt: number; // Timestamp
}

// Loadout system
export interface CompanionLoadout {
  slots: (string | null)[]; // Companion IDs, null = empty slot
  unlockedSlots: number; // 1, 2, or 3
}

// Slot unlock progress
export interface SlotUnlockProgress {
  slot2Points: number;
  slot3Points: number;
  // Track which milestones have been counted
  booksFinished: number;
  hoursLogged: number;
  companionsCollected: number;
  sessionsCompleted: number;
  genreLevelTens: string[]; // Genre IDs that hit level 10
  genresRead: string[]; // Unique genres read
}

// Genre levels
export type GenreLevels = Record<Genre, number>;

// Loot box tiers
export type LootBoxTier = 'wood' | 'silver' | 'gold';

// Enhanced loot box for V3
export interface LootBoxV3 {
  id: string;
  tier?: LootBoxTier; // Optional: undefined = blank box, roll at open time
  earnedAt: number;
  source: 'level_up' | 'bonus_drop' | 'completion';
  bookId?: string;
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
  // Reward System V3 fields
  genreLevels?: GenreLevels; // Per-genre levels
  loadout?: CompanionLoadout; // Equipped companions
  slotProgress?: SlotUnlockProgress; // Slot unlock tracking
  activeConsumables?: ActiveConsumable[]; // Active consumable effects
  lootBoxesV3?: LootBoxV3[]; // Tiered loot boxes
  goldPityCounter?: number; // Pity counter for gold boxes, resets on gold
}

export interface LootItem {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: number;
}
