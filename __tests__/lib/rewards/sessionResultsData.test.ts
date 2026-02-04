import {
  SessionResultsData,
  buildSessionResultsData,
  LegacyRewardData,
  SessionRewardResult,
} from '@/lib/rewards';
import { Book, UserProgress, Companion, Genre, GENRES } from '@/lib/shared';

const emptyLegacyData: LegacyRewardData = {
  readingTimeCompanions: [],
  readingTimeLootBoxes: [],
  achievementMilestones: [],
  achievementLootBoxes: [],
};

function createMockBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-1',
    title: 'Test Book',
    coverUrl: null,
    synopsis: null,
    sourceUrl: null,
    status: 'reading',
    totalReadingTime: 3600,
    createdAt: Date.now(),
    normalizedGenres: ['fantasy'] as Genre[],
    progression: { level: 1, totalSeconds: 3600, levelUps: [] },
    ...overrides,
  };
}

function createMockProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  const genreLevels: Record<Genre, number> = {} as Record<Genre, number>;
  for (const genre of GENRES) {
    genreLevels[genre] = 0;
  }
  return {
    totalXp: 600,
    level: 1,
    currentStreak: 3,
    longestStreak: 5,
    lastReadDate: null,
    genreLevels,
    goldPityCounter: 3,
    activeConsumables: [],
    ...overrides,
  } as UserProgress;
}

function createMockSessionResult(overrides: Partial<SessionRewardResult> = {}): SessionRewardResult {
  return {
    bookLevelsGained: 1,
    newBookLevel: 1,
    xpGained: 150,
    genreLevelIncreases: { fantasy: 1 } as Record<Genre, number>,
    lootBoxes: [{ id: 'lb1', earnedAt: Date.now(), source: 'level_up' }],
    bonusDrops: [],
    activeEffects: {
      xpBoost: 0.25,
      luck: 0.10,
      rareLuck: 0,
      legendaryLuck: 0,
      dropRateBoost: 0.10,
      completionBonus: 0,
    },
    updatedBook: createMockBook(),
    updatedProgress: createMockProgress(),
    previousBookLevel: 0,
    previousPlayerLevel: 1,
    previousGenreLevels: { fantasy: 0 } as Record<Genre, number>,
    baseXpBeforeBoosts: 120,
    streakMultiplier: 1.2,
    ...overrides,
  };
}

describe('sessionResultsData', () => {
  describe('buildSessionResultsData', () => {
    it('should include session minutes', () => {
      const result = createMockSessionResult();
      const data = buildSessionResultsData(result, 1800, emptyLegacyData, 2, 3);

      expect(data.sessionMinutes).toBe(30);
    });

    it('should calculate loot box breakdown by source', () => {
      const result = createMockSessionResult({
        lootBoxes: [
          { id: 'lb1', earnedAt: Date.now(), source: 'level_up' },
          { id: 'lb2', earnedAt: Date.now(), source: 'level_up' },
          { id: 'lb3', earnedAt: Date.now(), source: 'bonus_drop' },
        ],
        bonusDrops: [{ type: 'lootbox', lootBoxTier: 'wood' }] as any,
      });

      const data = buildSessionResultsData(result, 3600, emptyLegacyData, 0, 0);

      expect(data.lootBoxBreakdown.levelUp).toBe(2);
      expect(data.lootBoxBreakdown.bonusDrop).toBe(1);
      expect(data.lootBoxBreakdown.completion).toBe(0);
    });

    it('should include hero events sorted by priority', () => {
      const result = createMockSessionResult({
        bonusDrops: [{ type: 'consumable' }] as any,
        bookLevelsGained: 1,
      });

      const data = buildSessionResultsData(result, 3600, emptyLegacyData, 0, 0);

      expect(data.heroEvents.length).toBeGreaterThan(0);
      expect(data.heroEvents[0].type).toBe('bonus_drop'); // Higher priority than book_level_up
    });

    it('should include next milestones', () => {
      const result = createMockSessionResult();
      const data = buildSessionResultsData(result, 1800, emptyLegacyData, 0, 0);

      expect(data.nextMilestones.length).toBeGreaterThan(0);
    });

    it('should calculate total boost multiplier', () => {
      const result = createMockSessionResult({
        activeEffects: { xpBoost: 0.25, luck: 0, rareLuck: 0, legendaryLuck: 0, dropRateBoost: 0, completionBonus: 0 },
        streakMultiplier: 1.2,
      });

      const data = buildSessionResultsData(result, 3600, emptyLegacyData, 0, 0);

      // 1.25 (xp boost) * 1.2 (streak) = 1.5
      expect(data.totalBoostMultiplier).toBeCloseTo(1.5, 2);
    });

    it('should include current loot box odds', () => {
      const result = createMockSessionResult({
        updatedProgress: createMockProgress({
          goldPityCounter: 5,
        }),
        activeEffects: { xpBoost: 0, luck: 0.15, rareLuck: 0.10, legendaryLuck: 0, dropRateBoost: 0, completionBonus: 0 },
      });

      const data = buildSessionResultsData(result, 3600, emptyLegacyData, 0, 0);

      expect(data.lootBoxOdds.luck).toBe(0.15);
      expect(data.lootBoxOdds.rareLuck).toBe(0.10);
      expect(data.lootBoxOdds.pityCounter).toBe(5);
    });
  });
});
