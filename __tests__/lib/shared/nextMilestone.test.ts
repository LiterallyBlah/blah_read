import {
  NextMilestone,
  calculateNextMilestones,
  Book,
  UserProgress,
  Genre,
  GENRES,
} from '@/lib/shared';

function createMockBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-1',
    title: 'Test Book',
    coverUrl: null,
    synopsis: null,
    sourceUrl: null,
    status: 'reading',
    totalReadingTime: 1800, // 30 min
    createdAt: Date.now(),
    normalizedGenres: ['fantasy'] as Genre[],
    progression: { level: 0, totalSeconds: 1800, levelUps: [] },
    ...overrides,
  };
}

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
    genreLevels,
    ...overrides,
  } as UserProgress;
}

describe('nextMilestone', () => {
  describe('calculateNextMilestones', () => {
    it('should calculate next book level milestone', () => {
      const book = createMockBook({
        progression: { level: 0, totalSeconds: 1800, levelUps: [] }, // 30 min in
      });
      const progress = createMockProgress();

      const milestones = calculateNextMilestones(book, progress);
      const bookMilestone = milestones.find(m => m.type === 'book_level');

      expect(bookMilestone).toBeDefined();
      expect(bookMilestone!.remainingMinutes).toBe(30); // 30 min to next level
      expect(bookMilestone!.reward).toBe('loot_box');
    });

    it('should calculate next companion unlock milestone', () => {
      const book = createMockBook({
        totalReadingTime: 1500, // 25 min - next milestone at 30 min
      });
      const progress = createMockProgress();

      const milestones = calculateNextMilestones(book, progress);
      const companionMilestone = milestones.find(m => m.type === 'companion_unlock');

      expect(companionMilestone).toBeDefined();
      expect(companionMilestone!.remainingMinutes).toBe(5);
      expect(companionMilestone!.reward).toBe('companion');
    });

    it('should calculate genre rarity unlock at level 10', () => {
      // Set book past all companion milestones (past 10hr) and close to next book level
      // so the genre milestone can be in top 2
      const book = createMockBook({
        normalizedGenres: ['fantasy'] as Genre[],
        totalReadingTime: 36000 + 3500, // 10hr + 58min (2 min to next level)
        progression: { level: 10, totalSeconds: 36000 + 3500, levelUps: [] },
      });
      const baseGenreLevels: Record<Genre, number> = {} as Record<Genre, number>;
      for (const genre of GENRES) {
        baseGenreLevels[genre] = 0;
      }
      baseGenreLevels['fantasy'] = 8; // 2 levels to threshold 10
      const progress = createMockProgress({
        genreLevels: baseGenreLevels,
      });

      const milestones = calculateNextMilestones(book, progress);
      const genreMilestone = milestones.find(
        m => m.type === 'genre_rarity' && m.data?.genre === 'fantasy'
      );

      expect(genreMilestone).toBeDefined();
      expect(genreMilestone!.data?.threshold).toBe(10);
      expect(genreMilestone!.data?.levelsNeeded).toBe(2);
    });

    it('should calculate genre rarity unlock at level 20', () => {
      // Set book past all companion milestones (past 10hr) and close to next book level
      const book = createMockBook({
        normalizedGenres: ['fantasy'] as Genre[],
        totalReadingTime: 36000 + 3500, // 10hr + 58min
        progression: { level: 10, totalSeconds: 36000 + 3500, levelUps: [] },
      });
      const baseGenreLevels: Record<Genre, number> = {} as Record<Genre, number>;
      for (const genre of GENRES) {
        baseGenreLevels[genre] = 0;
      }
      baseGenreLevels['fantasy'] = 18; // 2 levels to threshold 20
      const progress = createMockProgress({
        genreLevels: baseGenreLevels,
      });

      const milestones = calculateNextMilestones(book, progress);
      const genreMilestone = milestones.find(
        m => m.type === 'genre_rarity' && m.data?.threshold === 20
      );

      expect(genreMilestone).toBeDefined();
      expect(genreMilestone!.data?.levelsNeeded).toBe(2);
    });

    it('should sort milestones by proximity (nearest first)', () => {
      const book = createMockBook({
        totalReadingTime: 3500, // 58 min - 2 min to level, 2 min to 1hr companion
        progression: { level: 0, totalSeconds: 3500, levelUps: [] },
      });
      const progress = createMockProgress();

      const milestones = calculateNextMilestones(book, progress);

      // Should be sorted by remaining time/levels
      expect(milestones.length).toBeGreaterThan(0);
      for (let i = 1; i < milestones.length; i++) {
        const prevRemaining = milestones[i - 1].remainingMinutes ?? (milestones[i - 1].data?.levelsNeeded as number ?? 0) * 60;
        const currRemaining = milestones[i].remainingMinutes ?? (milestones[i].data?.levelsNeeded as number ?? 0) * 60;
        expect(prevRemaining).toBeLessThanOrEqual(currRemaining);
      }
    });

    it('should return max 2 milestones', () => {
      const book = createMockBook();
      const progress = createMockProgress();

      const milestones = calculateNextMilestones(book, progress);

      expect(milestones.length).toBeLessThanOrEqual(2);
    });

    it('should prioritize reward-giving milestones', () => {
      const book = createMockBook({
        totalReadingTime: 1500, // 25 min
        progression: { level: 0, totalSeconds: 1500, levelUps: [] },
      });
      const progress = createMockProgress();

      const milestones = calculateNextMilestones(book, progress);

      // All returned milestones should have rewards
      for (const milestone of milestones) {
        expect(['loot_box', 'companion', 'rarity_unlock']).toContain(milestone.reward);
      }
    });
  });
});
