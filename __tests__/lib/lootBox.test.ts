import {
  checkLootBoxRewards,
  openLootBox,
  openLootBoxWithRarity,
  getPoolCompanions,
} from '@/lib/lootBox';
import type { UserProgress, Book, Companion } from '@/lib/types';

describe('lootBox', () => {
  describe('checkLootBoxRewards', () => {
    const baseProgress: UserProgress = {
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
    };

    it('awards boxes for streak milestones', () => {
      const prev = { ...baseProgress, currentStreak: 2 };
      const next = { ...baseProgress, currentStreak: 3 };

      const boxes = checkLootBoxRewards(prev, next);
      expect(boxes.some(b => b.source === 'streak_3')).toBe(true);
    });

    it('awards 2 boxes for 7-day streak', () => {
      const prev = { ...baseProgress, currentStreak: 6 };
      const next = { ...baseProgress, currentStreak: 7 };

      const boxes = checkLootBoxRewards(prev, next);
      const streakBoxes = boxes.filter(b => b.source === 'streak_7');
      expect(streakBoxes.length).toBe(2);
    });

    it('awards boxes for XP milestones', () => {
      const prev = { ...baseProgress, totalXp: 200 };
      const next = { ...baseProgress, totalXp: 300 };

      const boxes = checkLootBoxRewards(prev, next);
      expect(boxes.some(b => b.source === 'xp_250')).toBe(true);
    });

    it('awards boxes for finishing books', () => {
      const prev = { ...baseProgress, booksFinished: 0 };
      const next = { ...baseProgress, booksFinished: 1 };

      const boxes = checkLootBoxRewards(prev, next);
      const finishBoxes = boxes.filter(b => b.source === 'book_finished');
      expect(finishBoxes.length).toBe(2);
    });

    it('awards boxes for book count milestones', () => {
      const prev = { ...baseProgress, booksAdded: 2 };
      const next = { ...baseProgress, booksAdded: 3 };

      const boxes = checkLootBoxRewards(prev, next);
      expect(boxes.some(b => b.source === 'books_added_3')).toBe(true);
    });
  });

  describe('openLootBox', () => {
    const mockCompanion: Companion = {
      id: 'comp-1',
      bookId: 'book-1',
      name: 'Test Companion',
      type: 'character',
      rarity: 'common',
      description: 'A test',
      traits: 'Testy',
      visualDescription: 'A pixel character',
      imageUrl: 'http://example.com/image.png',
      source: 'discovered',
      unlockMethod: null,
      unlockedAt: null,
    };

    it('returns a companion from the pool', () => {
      const pool = [mockCompanion];
      const result = openLootBox(pool, null);

      expect(result.companion).toBeDefined();
      expect(result.companion?.unlockMethod).toBe('loot_box');
      expect(result.companion?.unlockedAt).toBeDefined();
    });

    it('weights toward current book companions', () => {
      const currentBookCompanion = { ...mockCompanion, bookId: 'current-book' };
      const otherBookCompanion = { ...mockCompanion, id: 'comp-2', bookId: 'other-book' };
      const pool = [otherBookCompanion, currentBookCompanion];

      // Run multiple times to check weighting
      let currentBookWins = 0;
      for (let i = 0; i < 100; i++) {
        const result = openLootBox(pool, 'current-book');
        if (result.companion?.bookId === 'current-book') {
          currentBookWins++;
        }
      }

      // Current book should win more often due to weighting
      expect(currentBookWins).toBeGreaterThan(60);
    });

    it('returns null when pool is empty', () => {
      const result = openLootBox([], null);
      expect(result.companion).toBeNull();
    });
  });

  describe('openLootBoxWithRarity', () => {
    const createMockCompanion = (id: string, rarity: 'common' | 'rare' | 'legendary', bookId = 'book-1'): Companion => ({
      id,
      bookId,
      name: `${rarity} Companion`,
      type: 'character',
      rarity,
      description: 'A test',
      traits: 'Testy',
      visualDescription: 'A pixel character',
      imageUrl: 'http://example.com/image.png',
      source: 'discovered',
      unlockMethod: null,
      unlockedAt: null,
    });

    it('selects companion of target rarity when available', () => {
      const pool = [
        createMockCompanion('common-1', 'common'),
        createMockCompanion('rare-1', 'rare'),
        createMockCompanion('legendary-1', 'legendary'),
      ];

      // Run multiple times to verify consistency
      for (let i = 0; i < 20; i++) {
        const result = openLootBoxWithRarity(pool, null, 'legendary');
        expect(result.companion?.rarity).toBe('legendary');
        expect(result.actualRarity).toBe('legendary');
      }
    });

    it('falls back to lower rarity when target unavailable', () => {
      const pool = [
        createMockCompanion('common-1', 'common'),
        createMockCompanion('rare-1', 'rare'),
      ];

      const result = openLootBoxWithRarity(pool, null, 'legendary');
      expect(result.companion?.rarity).toBe('rare');
      expect(result.actualRarity).toBe('rare');
    });

    it('falls back to common when only commons available', () => {
      const pool = [
        createMockCompanion('common-1', 'common'),
        createMockCompanion('common-2', 'common'),
      ];

      const result = openLootBoxWithRarity(pool, null, 'legendary');
      expect(result.companion?.rarity).toBe('common');
      expect(result.actualRarity).toBe('common');
    });

    it('still weights toward current book within rarity', () => {
      const pool = [
        createMockCompanion('rare-other', 'rare', 'other-book'),
        createMockCompanion('rare-current', 'rare', 'current-book'),
      ];

      let currentBookWins = 0;
      for (let i = 0; i < 100; i++) {
        const result = openLootBoxWithRarity(pool, 'current-book', 'rare');
        if (result.companion?.bookId === 'current-book') {
          currentBookWins++;
        }
      }

      // Current book should win more often due to weighting
      expect(currentBookWins).toBeGreaterThan(60);
    });

    it('returns null when pool is empty', () => {
      const result = openLootBoxWithRarity([], null, 'common');
      expect(result.companion).toBeNull();
      expect(result.actualRarity).toBeNull();
    });

    it('marks companion as unlocked via loot_box', () => {
      const pool = [createMockCompanion('rare-1', 'rare')];
      const result = openLootBoxWithRarity(pool, null, 'rare');

      expect(result.companion?.unlockMethod).toBe('loot_box');
      expect(result.companion?.unlockedAt).toBeDefined();
    });
  });

  describe('getPoolCompanions', () => {
    it('collects unlockable companions from all books', () => {
      const books: Book[] = [
        {
          id: 'book-1',
          title: 'Book 1',
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
            poolQueue: {
              companions: [
                {
                  id: 'comp-1',
                  bookId: 'book-1',
                  name: 'Pool Companion',
                  type: 'character',
                  rarity: 'common',
                  description: '',
                  traits: '',
                  visualDescription: '',
                  imageUrl: 'http://example.com/image.png',
                  source: 'discovered',
                  unlockMethod: null,
                  unlockedAt: null,
                },
              ],
              nextGenerateIndex: 1,
            },
            unlockedCompanions: [],
          },
        },
      ];

      const pool = getPoolCompanions(books);
      expect(pool).toHaveLength(1);
      expect(pool[0].imageUrl).toBeDefined(); // Has generated image
    });

    it('excludes companions without generated images', () => {
      const books: Book[] = [
        {
          id: 'book-1',
          title: 'Book 1',
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
            poolQueue: {
              companions: [
                {
                  id: 'comp-1',
                  bookId: 'book-1',
                  name: 'No Image',
                  type: 'character',
                  rarity: 'common',
                  description: '',
                  traits: '',
                  visualDescription: '',
                  imageUrl: null, // No image yet
                  source: 'discovered',
                  unlockMethod: null,
                  unlockedAt: null,
                },
              ],
              nextGenerateIndex: 0,
            },
            unlockedCompanions: [],
          },
        },
      ];

      const pool = getPoolCompanions(books);
      expect(pool).toHaveLength(0);
    });

    it('excludes companions from books with to_read status', () => {
      const books: Book[] = [
        {
          id: 'book-1',
          title: 'To Read Book',
          coverUrl: null,
          synopsis: null,
          sourceUrl: null,
          status: 'to_read', // Not started yet
          totalReadingTime: 0,
          createdAt: Date.now(),
          companions: {
            researchComplete: true,
            researchConfidence: 'high',
            readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
            poolQueue: {
              companions: [
                {
                  id: 'comp-1',
                  bookId: 'book-1',
                  name: 'Pool Companion',
                  type: 'character',
                  rarity: 'common',
                  description: '',
                  traits: '',
                  visualDescription: '',
                  imageUrl: 'http://example.com/image.png',
                  source: 'discovered',
                  unlockMethod: null,
                  unlockedAt: null,
                },
              ],
              nextGenerateIndex: 1,
            },
            unlockedCompanions: [],
          },
        },
        {
          id: 'book-2',
          title: 'Reading Book',
          coverUrl: null,
          synopsis: null,
          sourceUrl: null,
          status: 'reading', // Currently reading
          totalReadingTime: 0,
          createdAt: Date.now(),
          companions: {
            researchComplete: true,
            researchConfidence: 'high',
            readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
            poolQueue: {
              companions: [
                {
                  id: 'comp-2',
                  bookId: 'book-2',
                  name: 'Active Companion',
                  type: 'character',
                  rarity: 'rare',
                  description: '',
                  traits: '',
                  visualDescription: '',
                  imageUrl: 'http://example.com/image2.png',
                  source: 'discovered',
                  unlockMethod: null,
                  unlockedAt: null,
                },
              ],
              nextGenerateIndex: 1,
            },
            unlockedCompanions: [],
          },
        },
      ];

      const pool = getPoolCompanions(books);
      // Should only include companion from the 'reading' book
      expect(pool).toHaveLength(1);
      expect(pool[0].id).toBe('comp-2');
      expect(pool[0].bookId).toBe('book-2');
    });

    it('includes companions from finished books', () => {
      const books: Book[] = [
        {
          id: 'book-1',
          title: 'Finished Book',
          coverUrl: null,
          synopsis: null,
          sourceUrl: null,
          status: 'finished',
          totalReadingTime: 3600,
          createdAt: Date.now(),
          finishedAt: Date.now(),
          companions: {
            researchComplete: true,
            researchConfidence: 'high',
            readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
            poolQueue: {
              companions: [
                {
                  id: 'comp-1',
                  bookId: 'book-1',
                  name: 'Finished Book Companion',
                  type: 'character',
                  rarity: 'legendary',
                  description: '',
                  traits: '',
                  visualDescription: '',
                  imageUrl: 'http://example.com/image.png',
                  source: 'discovered',
                  unlockMethod: null,
                  unlockedAt: null,
                },
              ],
              nextGenerateIndex: 1,
            },
            unlockedCompanions: [],
          },
        },
      ];

      const pool = getPoolCompanions(books);
      expect(pool).toHaveLength(1);
      expect(pool[0].id).toBe('comp-1');
    });
  });
});
