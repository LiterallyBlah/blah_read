import { migrateData, CURRENT_VERSION } from '@/lib/migrations';
import type { Book, UserProgress, Companion } from '@/lib/types';

describe('migrations', () => {
  const baseProgress: UserProgress = {
    totalXp: 100,
    level: 2,
    currentStreak: 5,
    longestStreak: 10,
    lastReadDate: '2024-01-15',
    lootItems: [],
    lootBoxes: { availableBoxes: [], openHistory: [] },
    booksFinished: 0,
    booksAdded: 0,
    totalHoursRead: 0,
  };

  describe('v1 to v2 migration', () => {
    it('converts legacy companion to new companions format', async () => {
      const legacyBook: Book = {
        id: 'book-1',
        title: 'Test Book',
        coverUrl: null,
        synopsis: 'A synopsis',
        sourceUrl: null,
        status: 'reading',
        totalReadingTime: 18000, // 5 hours
        createdAt: Date.now(),
        companion: {
          id: 'companion-1',
          bookId: 'book-1',
          creature: 'Phoenix',
          archetype: 'Guardian',
          keywords: ['fire', 'rebirth'],
          imageUrl: 'http://example.com/image.png',
          generatedAt: Date.now() - 86400000,
        } as any,
      };

      const result = await migrateData([legacyBook], { ...baseProgress, version: 1 } as any);

      expect(result.books[0].companions).toBeDefined();
      expect(result.books[0].companions?.unlockedCompanions.length).toBe(1);
      expect(result.books[0].companions?.unlockedCompanions[0].name).toBe('Phoenix');
      expect(result.books[0].companions?.unlockedCompanions[0].rarity).toBe('legendary');
      expect(result.books[0].companions?.unlockedCompanions[0].unlockMethod).toBe('reading_time');
    });

    it('adds loot box state to progress', async () => {
      const progressV1 = {
        totalXp: 100,
        level: 2,
        currentStreak: 5,
        longestStreak: 10,
        lastReadDate: '2024-01-15',
        lootItems: [],
        version: 1,
      } as any;

      const result = await migrateData([], progressV1);

      expect(result.progress.lootBoxes).toBeDefined();
      expect(result.progress.lootBoxes.availableBoxes).toEqual([]);
      expect(result.progress.booksFinished).toBe(0);
      expect(result.progress.booksAdded).toBe(0);
      expect(result.progress.totalHoursRead).toBe(0);
    });

    it('updates version to current', async () => {
      const result = await migrateData([], { ...baseProgress, version: 1 } as any);
      expect(result.progress.version).toBe(CURRENT_VERSION);
    });

    it('preserves books without legacy companion', async () => {
      const modernBook: Book = {
        id: 'book-1',
        title: 'Modern Book',
        coverUrl: null,
        synopsis: null,
        sourceUrl: null,
        status: 'reading',
        totalReadingTime: 0,
        createdAt: Date.now(),
      };

      const result = await migrateData([modernBook], { ...baseProgress, version: 1 } as any);

      expect(result.books[0].companions).toBeUndefined();
    });
  });

  describe('version checks', () => {
    it('skips migration if already at current version', async () => {
      const bookWithCompanions: Book = {
        id: 'book-1',
        title: 'Test Book',
        coverUrl: null,
        synopsis: null,
        sourceUrl: null,
        status: 'reading',
        totalReadingTime: 0,
        createdAt: Date.now(),
        companions: {
          researchComplete: true,
          researchConfidence: 'high',
          readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
          poolQueue: { companions: [], nextGenerateIndex: 0 },
          unlockedCompanions: [],
        },
      };

      const result = await migrateData(
        [bookWithCompanions],
        { ...baseProgress, version: CURRENT_VERSION }
      );

      // Should return data unchanged
      expect(result.books[0].companions?.researchConfidence).toBe('high');
    });
  });
});
