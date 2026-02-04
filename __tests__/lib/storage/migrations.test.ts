import { migrateData, CURRENT_VERSION } from '@/lib/storage';
import type { Book, UserProgress, Companion } from '@/lib/shared';

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

  describe('v3 to v4 migration - per-book loadouts', () => {
    const v3Progress = {
      ...baseProgress,
      version: 3,
      genreLevels: {} as any,
      loadout: {
        slots: ['companion-1', 'companion-2', null] as [string | null, string | null, string | null],
        unlockedSlots: 2 as 1 | 2 | 3,
      },
      slotProgress: {
        slot2Points: 150,
        slot3Points: 80,
        booksFinished: 1,
        hoursLogged: 5,
        companionsCollected: 3,
        sessionsCompleted: 10,
        genreLevelTens: [],
        genresRead: ['fantasy'],
      },
      activeConsumables: [],
      lootBoxesV3: [],
    };

    it('copies global loadout to the reading book', async () => {
      const readingBook: Book = {
        id: 'reading-book',
        title: 'Currently Reading',
        coverUrl: null,
        synopsis: null,
        sourceUrl: null,
        status: 'reading',
        totalReadingTime: 3600,
        createdAt: Date.now(),
      };
      const finishedBook: Book = {
        id: 'finished-book',
        title: 'Finished Book',
        coverUrl: null,
        synopsis: null,
        sourceUrl: null,
        status: 'finished',
        totalReadingTime: 7200,
        createdAt: Date.now() - 86400000,
      };

      const result = await migrateData([readingBook, finishedBook], v3Progress as any);

      // Reading book gets the global loadout
      expect(result.books[0].loadout).toBeDefined();
      expect(result.books[0].loadout?.slots).toEqual(['companion-1', 'companion-2', null]);
      expect(result.books[0].loadout?.unlockedSlots).toBe(2);

      // Finished book gets empty loadout with same unlocked slots
      expect(result.books[1].loadout).toBeDefined();
      expect(result.books[1].loadout?.slots).toEqual([null, null, null]);
      expect(result.books[1].loadout?.unlockedSlots).toBe(2);
    });

    it('gives empty loadout to all books when no book is reading', async () => {
      const toReadBook: Book = {
        id: 'to-read-book',
        title: 'To Read',
        coverUrl: null,
        synopsis: null,
        sourceUrl: null,
        status: 'to_read',
        totalReadingTime: 0,
        createdAt: Date.now(),
      };

      const result = await migrateData([toReadBook], v3Progress as any);

      // No reading book, so all books get empty loadout
      expect(result.books[0].loadout).toBeDefined();
      expect(result.books[0].loadout?.slots).toEqual([null, null, null]);
      expect(result.books[0].loadout?.unlockedSlots).toBe(2);
    });

    it('picks most recent reading book when multiple books are reading', async () => {
      const olderReadingBook: Book = {
        id: 'older-reading',
        title: 'Older Reading',
        coverUrl: null,
        synopsis: null,
        sourceUrl: null,
        status: 'reading',
        totalReadingTime: 3600,
        createdAt: Date.now() - 86400000, // 1 day ago
      };
      const newerReadingBook: Book = {
        id: 'newer-reading',
        title: 'Newer Reading',
        coverUrl: null,
        synopsis: null,
        sourceUrl: null,
        status: 'reading',
        totalReadingTime: 1800,
        createdAt: Date.now(), // Now
      };

      const result = await migrateData([olderReadingBook, newerReadingBook], v3Progress as any);

      // Newer reading book gets the global loadout
      const newerBook = result.books.find(b => b.id === 'newer-reading');
      expect(newerBook?.loadout?.slots).toEqual(['companion-1', 'companion-2', null]);

      // Older reading book gets empty loadout
      const olderBook = result.books.find(b => b.id === 'older-reading');
      expect(olderBook?.loadout?.slots).toEqual([null, null, null]);
    });

    it('preserves existing per-book loadouts', async () => {
      const bookWithLoadout: Book = {
        id: 'book-with-loadout',
        title: 'Has Loadout',
        coverUrl: null,
        synopsis: null,
        sourceUrl: null,
        status: 'reading',
        totalReadingTime: 3600,
        createdAt: Date.now(),
        loadout: {
          slots: ['existing-companion', null, null],
          unlockedSlots: 1,
        },
      };

      const result = await migrateData([bookWithLoadout], v3Progress as any);

      // Should preserve existing loadout, not overwrite
      expect(result.books[0].loadout?.slots).toEqual(['existing-companion', null, null]);
      expect(result.books[0].loadout?.unlockedSlots).toBe(1);
    });

    it('uses default loadout when global loadout is missing', async () => {
      const progressWithoutLoadout = {
        ...baseProgress,
        version: 3,
        genreLevels: {} as any,
        // No loadout field
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
      };

      const readingBook: Book = {
        id: 'reading-book',
        title: 'Reading',
        coverUrl: null,
        synopsis: null,
        sourceUrl: null,
        status: 'reading',
        totalReadingTime: 0,
        createdAt: Date.now(),
      };

      const result = await migrateData([readingBook], progressWithoutLoadout as any);

      // Should use default loadout (1 slot unlocked, empty)
      expect(result.books[0].loadout?.slots).toEqual([null, null, null]);
      expect(result.books[0].loadout?.unlockedSlots).toBe(1);
    });

    it('updates version to 4', async () => {
      const result = await migrateData([], v3Progress as any);
      expect(result.progress.version).toBe(4);
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
