import {
  HeroEvent,
  detectHeroEvents,
  HERO_EVENT_PRIORITY,
  SlotUnlockState,
} from '@/lib/heroEvents';
import { SessionRewardResult } from '@/lib/sessionRewards';
import { Genre } from '@/lib/genres';
import { Companion } from '@/lib/types';

function createMockSessionResult(overrides: Partial<SessionRewardResult> = {}): SessionRewardResult {
  return {
    bookLevelsGained: 0,
    newBookLevel: 0,
    xpGained: 0,
    genreLevelIncreases: {} as Record<Genre, number>,
    lootBoxes: [],
    bonusDrops: [],
    activeEffects: {
      xpBoost: 0,
      luck: 0,
      rareLuck: 0,
      legendaryLuck: 0,
      dropRateBoost: 0,
      completionBonus: 0,
    },
    updatedBook: {} as any,
    updatedProgress: {} as any,
    previousBookLevel: 0,
    previousPlayerLevel: 1,
    previousGenreLevels: {} as Record<Genre, number>,
    baseXpBeforeBoosts: 0,
    streakMultiplier: 1.0,
    ...overrides,
  };
}

describe('heroEvents', () => {
  describe('HERO_EVENT_PRIORITY', () => {
    it('should have companion_unlocked as highest priority', () => {
      expect(HERO_EVENT_PRIORITY.companion_unlocked).toBe(1);
    });

    it('should have genre_level_up as lowest priority', () => {
      expect(HERO_EVENT_PRIORITY.genre_level_up).toBe(8);
    });
  });

  describe('detectHeroEvents', () => {
    it('should return empty array when nothing notable happened', () => {
      const result = createMockSessionResult();
      const events = detectHeroEvents(result, [], 0, 0);
      expect(events).toEqual([]);
    });

    it('should detect bonus drop as hero event', () => {
      const result = createMockSessionResult({ bonusDrops: [{ type: 'consumable' }] as any });
      const events = detectHeroEvents(result, [], 0, 0);

      expect(events).toContainEqual(
        expect.objectContaining({ type: 'bonus_drop' })
      );
    });

    it('should detect book level up', () => {
      const result = createMockSessionResult({
        previousBookLevel: 4,
        newBookLevel: 5,
        bookLevelsGained: 1,
      });
      const events = detectHeroEvents(result, [], 0, 0);

      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'book_level_up',
          data: { previousLevel: 4, newLevel: 5 },
        })
      );
    });

    it('should detect player level up', () => {
      const result = createMockSessionResult({
        previousPlayerLevel: 14,
        updatedProgress: { level: 15 } as any,
      });
      const events = detectHeroEvents(result, [], 0, 0);

      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'player_level_up',
          data: { previousLevel: 14, newLevel: 15 },
        })
      );
    });

    it('should detect genre level up', () => {
      const result = createMockSessionResult({
        previousGenreLevels: { fantasy: 14 } as Record<Genre, number>,
        genreLevelIncreases: { fantasy: 1 } as Record<Genre, number>,
      });
      const events = detectHeroEvents(result, [], 0, 0);

      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'genre_level_up',
          data: expect.objectContaining({ genre: 'fantasy' }),
        })
      );
    });

    it('should detect genre threshold crossing at level 10', () => {
      const result = createMockSessionResult({
        previousGenreLevels: { fantasy: 9 } as Record<Genre, number>,
        genreLevelIncreases: { fantasy: 1 } as Record<Genre, number>,
      });
      const events = detectHeroEvents(result, [], 0, 0);

      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'genre_threshold',
          data: expect.objectContaining({ genre: 'fantasy', threshold: 10 }),
        })
      );
    });

    it('should detect genre threshold crossing at level 20', () => {
      const result = createMockSessionResult({
        previousGenreLevels: { 'sci-fi': 19 } as Record<Genre, number>,
        genreLevelIncreases: { 'sci-fi': 2 } as Record<Genre, number>,
      });
      const events = detectHeroEvents(result, [], 0, 0);

      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'genre_threshold',
          data: expect.objectContaining({ genre: 'sci-fi', threshold: 20 }),
        })
      );
    });

    it('should detect streak threshold at 7 days', () => {
      const result = createMockSessionResult({ streakMultiplier: 1.5 });
      // Previous streak was 6, now 7
      const events = detectHeroEvents(result, [], 6, 7);

      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'streak_threshold',
          data: { streak: 7, multiplier: 1.5 },
        })
      );
    });

    it('should detect companion unlock', () => {
      const companion: Companion = {
        id: 'c1',
        name: 'Gandalf',
        rarity: 'legendary',
      } as Companion;
      const result = createMockSessionResult();
      const events = detectHeroEvents(result, [companion], 0, 0);

      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'companion_unlocked',
          data: { companion },
        })
      );
    });

    it('should sort events by priority', () => {
      const companion: Companion = {
        id: 'c1',
        name: 'Gandalf',
        rarity: 'legendary',
      } as Companion;
      const result = createMockSessionResult({
        bonusDrops: [{ type: 'consumable' }] as any,
        bookLevelsGained: 1,
        previousBookLevel: 4,
        newBookLevel: 5,
      });
      const events = detectHeroEvents(result, [companion], 0, 0);

      // companion_unlocked (1) should be first, then bonus_drop (3), then book_level_up (7)
      expect(events[0].type).toBe('companion_unlocked');
      expect(events[1].type).toBe('bonus_drop');
      expect(events[2].type).toBe('book_level_up');
    });

    it('should detect slot 2 unlock', () => {
      const result = createMockSessionResult();
      const events = detectHeroEvents(result, [], 0, 0, { previousSlot2: false, currentSlot2: true });

      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'slot_unlocked',
          data: { slot: 2 },
        })
      );
    });

    it('should detect slot 3 unlock', () => {
      const result = createMockSessionResult();
      const events = detectHeroEvents(result, [], 0, 0, { previousSlot3: false, currentSlot3: true });

      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'slot_unlocked',
          data: { slot: 3 },
        })
      );
    });

    it('should not detect slot unlock when already unlocked', () => {
      const result = createMockSessionResult();
      const events = detectHeroEvents(result, [], 0, 0, { previousSlot2: true, currentSlot2: true });

      expect(events).not.toContainEqual(
        expect.objectContaining({ type: 'slot_unlocked' })
      );
    });
  });
});
