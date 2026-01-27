import {
  checkLootBoxRewards,
  openLootBox,
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
  });
});
