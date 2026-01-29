import {
  processSessionEnd,
  SessionRewardResult,
  BASE_XP_PER_MINUTE,
} from '@/lib/sessionRewards';
import { Book, UserProgress, Companion, LootBoxV3 } from '@/lib/types';
import { Genre, GENRES } from '@/lib/genres';
import { CompanionEffect, ActiveEffects } from '@/lib/companionEffects';

// Helper to create a minimal valid book
function createMockBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-1',
    title: 'Test Book',
    coverUrl: null,
    synopsis: null,
    sourceUrl: null,
    status: 'reading',
    totalReadingTime: 0,
    createdAt: Date.now(),
    normalizedGenres: ['fantasy'] as Genre[],
    progression: {
      level: 0,
      totalSeconds: 0,
      levelUps: [],
    },
    pageCount: 300,
    ...overrides,
  };
}

// Helper to create a minimal valid user progress
function createMockProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  const genreLevels: Record<Genre, number> = {} as Record<Genre, number>;
  for (const genre of GENRES) {
    genreLevels[genre] = 0;
  }

  return {
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    lootItems: [],
    lootBoxes: {
      availableBoxes: [],
      openHistory: [],
    },
    booksFinished: 0,
    booksAdded: 0,
    totalHoursRead: 0,
    genreLevels,
    loadout: {
      slots: [null, null, null],
      unlockedSlots: 1,
    },
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
    ...overrides,
  };
}

// Helper to create a mock companion with effects
function createMockCompanion(
  id: string,
  effects: CompanionEffect[] = []
): Companion {
  return {
    id,
    bookId: 'book-1',
    name: 'Test Companion',
    type: 'creature',
    rarity: 'common',
    description: 'A test companion',
    traits: 'friendly, helpful',
    visualDescription: 'A small creature',
    imageUrl: null,
    source: 'discovered',
    unlockMethod: 'reading_time',
    unlockedAt: Date.now(),
    effects,
  };
}

describe('sessionRewards', () => {
  describe('BASE_XP_PER_MINUTE constant', () => {
    it('should be 10 XP per minute', () => {
      expect(BASE_XP_PER_MINUTE).toBe(10);
    });
  });

  describe('processSessionEnd', () => {
    describe('basic session processing', () => {
      it('should process reading session and award levels', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        // 1 hour (3600 seconds) = 1 level
        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.bookLevelsGained).toBe(1);
        expect(result.newBookLevel).toBe(1);
        // Filter for level_up boxes only (checkpoint bonus drops may also occur)
        const levelUpBoxes = result.lootBoxes.filter(b => b.source === 'level_up');
        expect(levelUpBoxes.length).toBe(1);
      });

      it('should award no levels for short sessions', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        // 4 minutes = no level, under checkpoint minimum
        const result = processSessionEnd(mockBook, mockProgress, [], 240);

        expect(result.bookLevelsGained).toBe(0);
        expect(result.newBookLevel).toBe(0);
        expect(result.lootBoxes.length).toBe(0);
      });

      it('should award multiple levels for long sessions', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        // 3 hours = 3 levels
        const result = processSessionEnd(mockBook, mockProgress, [], 10800);

        expect(result.bookLevelsGained).toBe(3);
        expect(result.newBookLevel).toBe(3);
        // Filter for level_up boxes only (checkpoint bonus drops may also occur)
        const levelUpBoxes = result.lootBoxes.filter(b => b.source === 'level_up');
        expect(levelUpBoxes.length).toBe(3);
      });

      it('should return bonusDropCount as number', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(typeof result.bonusDropCount).toBe('number');
        expect(result.bonusDropCount).toBeGreaterThanOrEqual(0);
      });

      it('should track levels on book with existing progression', () => {
        const mockBook = createMockBook({
          progression: {
            level: 2,
            totalSeconds: 7200, // 2 hours
            levelUps: [3600, 7200],
          },
        });
        const mockProgress = createMockProgress();

        // Add 1 more hour = level 3
        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.bookLevelsGained).toBe(1);
        expect(result.newBookLevel).toBe(3);
      });
    });

    describe('XP calculation', () => {
      it('should calculate base XP correctly', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        // 60 minutes = 600 XP base (10 XP/min)
        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.xpGained).toBe(600);
      });

      it('should apply XP boost from companions', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();
        const companion = createMockCompanion('comp-1', [
          { type: 'xp_boost', magnitude: 0.20, targetGenre: 'fantasy' },
        ]);

        // 60 minutes with 20% boost = 720 XP
        const result = processSessionEnd(mockBook, mockProgress, [companion], 3600);

        expect(result.xpGained).toBeGreaterThan(600); // 600 base * 1.2 = 720
        expect(result.xpGained).toBe(720);
      });

      it('should apply global XP boost regardless of genre', () => {
        const mockBook = createMockBook({ normalizedGenres: ['mystery-thriller'] });
        const mockProgress = createMockProgress();
        const companion = createMockCompanion('comp-1', [
          { type: 'xp_boost', magnitude: 0.20 }, // No targetGenre = global
        ]);

        const result = processSessionEnd(mockBook, mockProgress, [companion], 3600);

        expect(result.xpGained).toBe(720); // 600 * 1.2
      });

      it('should not apply genre-specific boost if genre does not match', () => {
        const mockBook = createMockBook({ normalizedGenres: ['mystery-thriller'] });
        const mockProgress = createMockProgress();
        const companion = createMockCompanion('comp-1', [
          { type: 'xp_boost', magnitude: 0.20, targetGenre: 'fantasy' }, // Wrong genre
        ]);

        const result = processSessionEnd(mockBook, mockProgress, [companion], 3600);

        expect(result.xpGained).toBe(600); // No boost applied
      });

      it('should stack multiple XP boosts', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();
        const companion1 = createMockCompanion('comp-1', [
          { type: 'xp_boost', magnitude: 0.20, targetGenre: 'fantasy' },
        ]);
        const companion2 = createMockCompanion('comp-2', [
          { type: 'xp_boost', magnitude: 0.10 }, // Global
        ]);

        // 600 * (1 + 0.20 + 0.10) = 780
        const result = processSessionEnd(mockBook, mockProgress, [companion1, companion2], 3600);

        expect(result.xpGained).toBe(780);
      });
    });

    describe('genre level increases', () => {
      it('should increase genre level for book genres', () => {
        const mockBook = createMockBook({ normalizedGenres: ['fantasy'] });
        const mockProgress = createMockProgress();

        // 1 level = 1 genre level increase
        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.genreLevelIncreases.fantasy).toBe(1);
      });

      it('should distribute levels across multiple genres', () => {
        const mockBook = createMockBook({
          normalizedGenres: ['fantasy', 'romance'],
        });
        const mockProgress = createMockProgress();

        // 2 levels distributed across 2 genres = 1 each
        const result = processSessionEnd(mockBook, mockProgress, [], 7200);

        expect(result.genreLevelIncreases.fantasy).toBe(1);
        expect(result.genreLevelIncreases.romance).toBe(1);
      });

      it('should not increase genre levels when no level gained', () => {
        const mockBook = createMockBook({ normalizedGenres: ['fantasy'] });
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 1800); // 30 min

        expect(result.genreLevelIncreases.fantasy).toBe(0);
      });
    });

    describe('genre level distribution', () => {
      it('should distribute levels evenly across multiple genres', () => {
        const mockBook = createMockBook({
          normalizedGenres: ['fantasy', 'romance'],
        });
        const mockProgress = createMockProgress();

        // 2 levels gained with 2 genres = 1 level each
        const result = processSessionEnd(mockBook, mockProgress, [], 7200);

        expect(result.genreLevelIncreases.fantasy).toBe(1);
        expect(result.genreLevelIncreases.romance).toBe(1);
      });

      it('should give full levels to single-genre books', () => {
        const mockBook = createMockBook({
          normalizedGenres: ['fantasy'],
        });
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 7200);

        expect(result.genreLevelIncreases.fantasy).toBe(2);
      });

      it('should handle odd level distribution with floor division', () => {
        const mockBook = createMockBook({
          normalizedGenres: ['fantasy', 'romance', 'horror'],
        });
        const mockProgress = createMockProgress();

        // 2 levels with 3 genres = floor(2/3) = 0 each, remainder 2
        // Distribute remainder: fantasy gets 1, romance gets 1, horror gets 0
        const result = processSessionEnd(mockBook, mockProgress, [], 7200);

        const total = result.genreLevelIncreases.fantasy +
                      result.genreLevelIncreases.romance +
                      result.genreLevelIncreases.horror;
        expect(total).toBe(2); // Total levels preserved
      });
    });

    describe('loot box generation', () => {
      it('should generate one loot box per level gained', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 7200); // 2 levels

        // Filter to only level_up boxes (exclude bonus_drop boxes from checkpoints)
        const levelUpBoxes = result.lootBoxes.filter(b => b.source === 'level_up');
        expect(levelUpBoxes.length).toBe(2);
        levelUpBoxes.forEach(box => {
          expect(box.source).toBe('level_up');
          expect(box.bookId).toBe('book-1');
        });
      });

      it('should create blank boxes without tier (tier determined at open time)', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();
        const companion = createMockCompanion('comp-1', [
          { type: 'luck', magnitude: 0.30, targetGenre: 'fantasy' },
        ]);

        // Even with luck boost, boxes should not have tier assigned at earn time
        const result = processSessionEnd(mockBook, mockProgress, [companion], 3600);

        expect(result.lootBoxes.length).toBe(1);
        expect(result.lootBoxes[0].tier).toBeUndefined();
        // Tier will be determined at open time using the luck boost
      });
    });

    describe('checkpoint bonus drops', () => {
      it('should not trigger drops for sessions under 5 minutes', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();
        const companion = createMockCompanion('comp-1', [
          { type: 'drop_rate_boost', magnitude: 0.99, targetGenre: 'fantasy' },
        ]);

        // 4 minutes = under minimum, no drops even with high boost
        const result = processSessionEnd(mockBook, mockProgress, [companion], 240);

        expect(result.bonusDropCount).toBe(0);
        expect(result.lootBoxes.filter(b => b.source === 'bonus_drop').length).toBe(0);
      });

      it('should award drops based on checkpoints with boost', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        // Mock to always succeed
        jest.spyOn(Math, 'random').mockReturnValue(0.001);

        const companion = createMockCompanion('comp-1', [
          { type: 'drop_rate_boost', magnitude: 0.50, targetGenre: 'fantasy' },
        ]);

        // 25 minutes = 2 full checkpoints + partial
        // With mock always succeeding, should get 3 drops
        const result = processSessionEnd(mockBook, mockProgress, [companion], 1500);

        expect(result.bonusDropCount).toBe(3);
        expect(result.lootBoxes.filter(b => b.source === 'bonus_drop').length).toBe(3);

        jest.restoreAllMocks();
      });

      it('should award multiple bonus boxes for long sessions', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        // Mock to always succeed
        jest.spyOn(Math, 'random').mockReturnValue(0.001);

        const companion = createMockCompanion('comp-1', [
          { type: 'drop_rate_boost', magnitude: 0.50, targetGenre: 'fantasy' },
        ]);

        // 60 minutes = 6 checkpoints
        const result = processSessionEnd(mockBook, mockProgress, [companion], 3600);

        expect(result.bonusDropCount).toBe(6);

        jest.restoreAllMocks();
      });

      it('should have low chance without drop rate boost', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        // No boost = 1% base per checkpoint
        let totalDrops = 0;
        for (let i = 0; i < 100; i++) {
          const result = processSessionEnd(mockBook, mockProgress, [], 3600);
          totalDrops += result.bonusDropCount;
        }

        // 6 checkpoints at 1% = 6% per session
        // Over 100 sessions, expect ~6 drops (allow variance)
        expect(totalDrops).toBeLessThan(30);
      });
    });

    describe('completion bonus', () => {
      it('should award completion bonus levels when isCompletion is true', () => {
        const mockBook = createMockBook({
          pageCount: 300, // 300 pages = 10 level floor
          progression: {
            level: 4,
            totalSeconds: 14400, // 4 hours = 4 levels
            levelUps: [],
          },
        });
        const mockProgress = createMockProgress();

        // isCompletion = true, should get 6 bonus levels (10 - 4)
        const result = processSessionEnd(mockBook, mockProgress, [], 0, true);

        expect(result.bookLevelsGained).toBe(6); // Completion bonus
        expect(result.newBookLevel).toBe(10);
        expect(result.lootBoxes.length).toBe(6);
      });

      it('should not award completion bonus when already at or above floor', () => {
        const mockBook = createMockBook({
          pageCount: 300, // 300 pages = 10 level floor
          progression: {
            level: 12,
            totalSeconds: 43200, // 12 hours
            levelUps: [],
          },
        });
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 0, true);

        expect(result.bookLevelsGained).toBe(0);
      });

      it('should award completion loot boxes with completion source', () => {
        const mockBook = createMockBook({
          pageCount: 90, // 3 level floor
          progression: {
            level: 1,
            totalSeconds: 3600,
            levelUps: [],
          },
        });
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 0, true);

        const completionBoxes = result.lootBoxes.filter(b => b.source === 'completion');
        expect(completionBoxes.length).toBe(2); // 3 - 1 = 2 bonus levels
      });
    });

    describe('active effects tracking', () => {
      it('should return active effects in result', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();
        const companion = createMockCompanion('comp-1', [
          { type: 'xp_boost', magnitude: 0.20, targetGenre: 'fantasy' },
          { type: 'luck', magnitude: 0.15 },
        ]);

        const result = processSessionEnd(mockBook, mockProgress, [companion], 3600);

        expect(result.activeEffects.xpBoost).toBe(0.20);
        expect(result.activeEffects.luck).toBe(0.15);
      });
    });

    describe('book and progress updates', () => {
      it('should return updated book with new progression', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.updatedBook.progression?.level).toBe(1);
        expect(result.updatedBook.progression?.totalSeconds).toBe(3600);
      });

      it('should return updated progress with new XP', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress({ totalXp: 100 });

        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.updatedProgress.totalXp).toBe(700); // 100 + 600
      });

      it('should return updated progress with new genre levels', () => {
        const mockBook = createMockBook({ normalizedGenres: ['fantasy', 'romance'] });
        const mockProgress = createMockProgress();
        mockProgress.genreLevels!.fantasy = 5;
        mockProgress.genreLevels!.romance = 3;

        // 2 levels distributed across 2 genres = 1 each
        const result = processSessionEnd(mockBook, mockProgress, [], 7200);

        expect(result.updatedProgress.genreLevels?.fantasy).toBe(6); // 5 + 1
        expect(result.updatedProgress.genreLevels?.romance).toBe(4); // 3 + 1
      });

      it('should return updated progress with new loot boxes', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.updatedProgress.lootBoxesV3?.length).toBe(1);
      });

      it('should tick consumables after processing', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress({
          activeConsumables: [
            { consumableId: 'weak_xp_1', remainingDuration: 120, appliedAt: Date.now() },
          ],
        });

        const result = processSessionEnd(mockBook, mockProgress, [], 3600); // 60 min session

        // Duration should be decremented by 60 minutes
        expect(result.updatedProgress.activeConsumables?.length).toBe(1);
        expect(result.updatedProgress.activeConsumables?.[0].remainingDuration).toBe(60);
      });

      it('should remove expired consumables', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress({
          activeConsumables: [
            { consumableId: 'weak_xp_1', remainingDuration: 30, appliedAt: Date.now() },
          ],
        });

        const result = processSessionEnd(mockBook, mockProgress, [], 3600); // 60 min session

        // Consumable should be removed (duration was 30, session was 60 min)
        expect(result.updatedProgress.activeConsumables?.length).toBe(0);
      });
    });

    describe('consumable effects integration', () => {
      it('should apply XP boost from active consumables', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress({
          activeConsumables: [
            { consumableId: 'weak_xp_1', remainingDuration: 60, appliedAt: Date.now() }, // +10% XP
          ],
        });

        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        // 600 base * 1.10 = 660
        expect(result.xpGained).toBe(660);
      });

      it('should combine companion and consumable XP boosts', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress({
          activeConsumables: [
            { consumableId: 'weak_xp_1', remainingDuration: 60, appliedAt: Date.now() }, // +10% XP
          ],
        });
        const companion = createMockCompanion('comp-1', [
          { type: 'xp_boost', magnitude: 0.20, targetGenre: 'fantasy' },
        ]);

        // 600 base * (1 + 0.10 + 0.20) = 780
        const result = processSessionEnd(mockBook, mockProgress, [companion], 3600);

        expect(result.xpGained).toBe(780);
      });

      it('should combine luck boosts from companions and consumables', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress({
          activeConsumables: [
            { consumableId: 'weak_luck_1', remainingDuration: 120, appliedAt: Date.now() }, // +5% luck
          ],
        });
        const companion = createMockCompanion('comp-1', [
          { type: 'luck', magnitude: 0.10, targetGenre: 'fantasy' },
        ]);

        const result = processSessionEnd(mockBook, mockProgress, [companion], 3600);

        // Total luck boost should be 0.15 (using toBeCloseTo for floating point)
        expect(result.activeEffects.luck).toBeCloseTo(0.15);
      });
    });

    describe('streak multiplier', () => {
      it('should apply 1.2x streak multiplier at 3-day streak', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress({ currentStreak: 3 });

        // 60 minutes = 600 base XP * 1.2 streak = 720 XP
        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.xpGained).toBe(720);
      });

      it('should apply 1.5x streak multiplier at 7-day streak', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress({ currentStreak: 7 });

        // 60 minutes = 600 base XP * 1.5 streak = 900 XP
        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.xpGained).toBe(900);
      });

      it('should stack streak multiplier with XP boost', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress({ currentStreak: 3 });
        const companion = createMockCompanion('comp-1', [
          { type: 'xp_boost', magnitude: 0.20, targetGenre: 'fantasy' },
        ]);

        // 600 base * 1.2 streak * (1 + 0.20 boost) = 864 XP
        const result = processSessionEnd(mockBook, mockProgress, [companion], 3600);

        expect(result.xpGained).toBe(864);
      });

      it('should apply no multiplier for streak under 3', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress({ currentStreak: 2 });

        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.xpGained).toBe(600);
      });
    });

    describe('blank box earning', () => {
      it('should create boxes without tier', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        // 1 hour session = 1 level = 1 box
        const result = processSessionEnd(mockBook, mockProgress, [], 3600, false);

        expect(result.lootBoxes.length).toBe(1);
        expect(result.lootBoxes[0].tier).toBeUndefined();
        expect(result.lootBoxes[0].source).toBe('level_up');
      });

      it('should create completion boxes without tier', () => {
        const mockBook = createMockBook({
          pageCount: 90, // 3 level floor
          progression: {
            level: 1,
            totalSeconds: 3600,
            levelUps: [],
          },
        });
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 0, true);

        const completionBoxes = result.lootBoxes.filter(b => b.source === 'completion');
        expect(completionBoxes.length).toBe(2); // 3 - 1 = 2 bonus levels
        completionBoxes.forEach(box => {
          expect(box.tier).toBeUndefined();
        });
      });

      it('should create bonus drop boxes without tier', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        // Mock to always succeed
        jest.spyOn(Math, 'random').mockReturnValue(0.001);

        const companion = createMockCompanion('comp-1', [
          { type: 'drop_rate_boost', magnitude: 0.50, targetGenre: 'fantasy' },
        ]);

        // 10 minutes = 1 checkpoint
        const result = processSessionEnd(mockBook, mockProgress, [companion], 600);

        const bonusBoxes = result.lootBoxes.filter(b => b.source === 'bonus_drop');
        expect(bonusBoxes.length).toBe(1);
        expect(bonusBoxes[0].tier).toBeUndefined();

        jest.restoreAllMocks();
      });
    });

    describe('combineEffects with new luck types', () => {
      it('should combine all three luck types from companions and consumables', () => {
        const mockBook = createMockBook({ normalizedGenres: ['fantasy'] });
        const mockProgress = createMockProgress({
          activeConsumables: [
            { consumableId: 'weak_luck_1', remainingDuration: 60, appliedAt: Date.now() }, // +5% luck
          ],
        });

        // Companion with legendary_luck effect
        const companion: Companion = {
          id: 'c1',
          bookId: 'book-1',
          name: 'Lucky Dragon',
          type: 'creature',
          rarity: 'legendary',
          description: 'A dragon that brings legendary luck',
          traits: 'lucky',
          visualDescription: 'A golden dragon',
          imageUrl: null,
          source: 'discovered',
          unlockMethod: 'reading_time',
          unlockedAt: Date.now(),
          effects: [{ type: 'legendary_luck', magnitude: 0.25 }],
        };

        const result = processSessionEnd(mockBook, mockProgress, [companion], 3600);

        // weak_luck_1 consumable provides +5% luck
        expect(result.activeEffects.luck).toBeCloseTo(0.05);
        // Companion provides +25% legendary luck
        expect(result.activeEffects.legendaryLuck).toBeCloseTo(0.25);
      });

      it('should combine rare_luck from companion with other luck types', () => {
        const mockBook = createMockBook({ normalizedGenres: ['fantasy'] });
        const mockProgress = createMockProgress({
          activeConsumables: [
            { consumableId: 'weak_luck_1', remainingDuration: 60, appliedAt: Date.now() }, // +5% luck
          ],
        });

        // Companion with rare_luck effect
        const companion: Companion = {
          id: 'c2',
          bookId: 'book-1',
          name: 'Silver Fox',
          type: 'creature',
          rarity: 'rare',
          description: 'A fox that brings rare luck',
          traits: 'cunning',
          visualDescription: 'A silver fox',
          imageUrl: null,
          source: 'discovered',
          unlockMethod: 'reading_time',
          unlockedAt: Date.now(),
          effects: [{ type: 'rare_luck', magnitude: 0.15 }],
        };

        const result = processSessionEnd(mockBook, mockProgress, [companion], 3600);

        expect(result.activeEffects.luck).toBeCloseTo(0.05); // from consumable
        expect(result.activeEffects.rareLuck).toBeCloseTo(0.15); // from companion
        expect(result.activeEffects.legendaryLuck).toBe(0); // none present
      });

      it('should stack luck effects from multiple companions', () => {
        const mockBook = createMockBook({ normalizedGenres: ['fantasy'] });
        const mockProgress = createMockProgress();

        const companion1 = createMockCompanion('comp-1', [
          { type: 'luck', magnitude: 0.10 },
        ]);
        const companion2 = createMockCompanion('comp-2', [
          { type: 'rare_luck', magnitude: 0.15 },
        ]);
        const companion3 = createMockCompanion('comp-3', [
          { type: 'legendary_luck', magnitude: 0.20 },
        ]);

        const result = processSessionEnd(
          mockBook,
          mockProgress,
          [companion1, companion2, companion3],
          3600
        );

        expect(result.activeEffects.luck).toBeCloseTo(0.10);
        expect(result.activeEffects.rareLuck).toBeCloseTo(0.15);
        expect(result.activeEffects.legendaryLuck).toBeCloseTo(0.20);
      });

      it('should return zero for all luck types when no luck effects present', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        // Companion with only XP boost, no luck
        const companion = createMockCompanion('comp-1', [
          { type: 'xp_boost', magnitude: 0.20, targetGenre: 'fantasy' },
        ]);

        const result = processSessionEnd(mockBook, mockProgress, [companion], 3600);

        expect(result.activeEffects.luck).toBe(0);
        expect(result.activeEffects.rareLuck).toBe(0);
        expect(result.activeEffects.legendaryLuck).toBe(0);
      });
    });

    describe('previous state tracking', () => {
      it('should include previousBookLevel in result', () => {
        const mockBook = createMockBook({
          progression: { level: 3, totalSeconds: 10800, levelUps: [] },
        });
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.previousBookLevel).toBe(3);
        expect(result.newBookLevel).toBe(4);
      });

      it('should include previousPlayerLevel in result', () => {
        const mockProgress = createMockProgress({ totalXp: 950 });
        const mockBook = createMockBook();

        // 10 min = 100 XP, pushes from level 1 to level 2
        const result = processSessionEnd(mockBook, mockProgress, [], 600);

        expect(result.previousPlayerLevel).toBe(1);
      });

      it('should include previousGenreLevels in result', () => {
        const mockBook = createMockBook({ normalizedGenres: ['fantasy'] as Genre[] });
        const mockProgress = createMockProgress({
          genreLevels: { fantasy: 5 } as Record<Genre, number>,
        });

        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.previousGenreLevels.fantasy).toBe(5);
      });

      it('should include streakMultiplier in result', () => {
        const mockProgress = createMockProgress({ currentStreak: 7 });
        const mockBook = createMockBook();

        const result = processSessionEnd(mockBook, mockProgress, [], 600);

        expect(result.streakMultiplier).toBe(1.5);
      });

      it('should include baseXpBeforeBoosts in result', () => {
        const mockProgress = createMockProgress({ currentStreak: 0 });
        const mockBook = createMockBook();
        const companion = createMockCompanion('c1', [
          { type: 'xp_boost', magnitude: 0.5 },
        ]);

        // 10 min = 100 base XP, with 50% boost = 150 XP
        const result = processSessionEnd(mockBook, mockProgress, [companion], 600);

        expect(result.baseXpBeforeBoosts).toBe(100);
        expect(result.xpGained).toBe(150);
      });
    });

    describe('edge cases', () => {
      it('should handle book with no genres', () => {
        const mockBook = createMockBook({ normalizedGenres: [] });
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.bookLevelsGained).toBe(1);
        // All genre increases should be 0
        for (const genre of GENRES) {
          expect(result.genreLevelIncreases[genre]).toBe(0);
        }
      });

      it('should handle book with undefined normalizedGenres', () => {
        const mockBook = createMockBook();
        delete mockBook.normalizedGenres;
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.bookLevelsGained).toBe(1);
      });

      it('should handle book with no progression', () => {
        const mockBook = createMockBook();
        delete mockBook.progression;
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.newBookLevel).toBe(1);
        expect(result.updatedBook.progression?.level).toBe(1);
      });

      it('should handle empty companions array', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 3600);

        expect(result.activeEffects.xpBoost).toBe(0);
        expect(result.activeEffects.luck).toBe(0);
        expect(result.activeEffects.dropRateBoost).toBe(0);
        expect(result.activeEffects.completionBonus).toBe(0);
      });

      it('should handle companion with no effects', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();
        const companion = createMockCompanion('comp-1', []);

        const result = processSessionEnd(mockBook, mockProgress, [companion], 3600);

        expect(result.xpGained).toBe(600); // Base XP, no boost
      });

      it('should handle 0 session seconds', () => {
        const mockBook = createMockBook();
        const mockProgress = createMockProgress();

        const result = processSessionEnd(mockBook, mockProgress, [], 0);

        expect(result.bookLevelsGained).toBe(0);
        expect(result.xpGained).toBe(0);
        expect(result.lootBoxes.length).toBe(0);
      });
    });
  });
});
