# Session Results Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a post-session results screen that shows rewards earned, progress made, and next milestones - replacing the current Alert popup.

**Architecture:** Extend `SessionRewardResult` with "before" state for transitions, create pure logic functions for hero events and milestones, build a layered UI component with expandable details. The timer screen navigates to the new results screen instead of showing an Alert.

**Tech Stack:** React Native, TypeScript, Jest, Expo Router

---

## Task 1: Extend SessionRewardResult with Previous State

**Files:**
- Modify: `/mnt/c/Users/micha/Projects/blah_read/lib/sessionRewards.ts`
- Test: `/mnt/c/Users/micha/Projects/blah_read/__tests__/lib/sessionRewards.test.ts`

### Step 1: Write the failing test

Add to `__tests__/lib/sessionRewards.test.ts`:

```typescript
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
```

### Step 2: Run test to verify it fails

Run: `npm test -- --testPathPattern="sessionRewards" --testNamePattern="previous state tracking" -t "previousBookLevel"`
Expected: FAIL with "Property 'previousBookLevel' does not exist"

### Step 3: Update the interface and implementation

In `/mnt/c/Users/micha/Projects/blah_read/lib/sessionRewards.ts`, update `SessionRewardResult`:

```typescript
export interface SessionRewardResult {
  // Existing fields
  bookLevelsGained: number;
  newBookLevel: number;
  xpGained: number;
  genreLevelIncreases: Record<Genre, number>;
  lootBoxes: LootBoxV3[];
  bonusDropTriggered: boolean;
  activeEffects: ActiveEffects;
  updatedBook: Book;
  updatedProgress: UserProgress;
  // New fields for results screen
  previousBookLevel: number;
  previousPlayerLevel: number;
  previousGenreLevels: Record<Genre, number>;
  baseXpBeforeBoosts: number;
  streakMultiplier: number;
}
```

In `processSessionEnd`, capture previous state at the start and include in return:

```typescript
export function processSessionEnd(
  book: Book,
  progress: UserProgress,
  equippedCompanions: Companion[],
  sessionSeconds: number,
  isCompletion: boolean = false
): SessionRewardResult {
  const now = Date.now();
  const validSessionSeconds = Math.max(0, sessionSeconds);
  const bookGenres = book.normalizedGenres || [];

  // Capture previous state BEFORE any calculations
  const previousBookLevel = book.progression?.level ?? 0;
  const previousPlayerLevel = calculateLevel(progress.totalXp);
  const previousGenreLevels = { ...(progress.genreLevels || createEmptyGenreLevelIncreases()) };

  // ... existing code for effects calculation ...

  // Calculate streak multiplier (capture for display)
  const streakMultiplier = getStreakMultiplier(progress.currentStreak);

  // Calculate base XP before boosts (for display)
  const minutes = validSessionSeconds / 60;
  const baseXpBeforeBoosts = Math.round(minutes * BASE_XP_PER_MINUTE * streakMultiplier);
  const xpGained = Math.round(baseXpBeforeBoosts * (1 + totalXpBoost));

  // ... rest of existing code ...

  return {
    // ... existing return values ...
    previousBookLevel,
    previousPlayerLevel,
    previousGenreLevels,
    baseXpBeforeBoosts,
    streakMultiplier,
  };
}
```

Add import at top:

```typescript
import { calculateLevel } from './xp';
```

### Step 4: Run test to verify it passes

Run: `npm test -- --testPathPattern="sessionRewards" --testNamePattern="previous state tracking"`
Expected: PASS

### Step 5: Commit

```bash
git add lib/sessionRewards.ts __tests__/lib/sessionRewards.test.ts
git commit -m "feat(session): add previous state tracking to SessionRewardResult"
```

---

## Task 2: Create Hero Events Detection Logic

**Files:**
- Create: `/mnt/c/Users/micha/Projects/blah_read/lib/heroEvents.ts`
- Create: `/mnt/c/Users/micha/Projects/blah_read/__tests__/lib/heroEvents.test.ts`

### Step 1: Write the failing tests

Create `/mnt/c/Users/micha/Projects/blah_read/__tests__/lib/heroEvents.test.ts`:

```typescript
import {
  HeroEvent,
  detectHeroEvents,
  HERO_EVENT_PRIORITY,
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
    bonusDropTriggered: false,
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

    it('should have book_level_up as lowest priority', () => {
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
      const result = createMockSessionResult({ bonusDropTriggered: true });
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
        bonusDropTriggered: true,
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
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- --testPathPattern="heroEvents"`
Expected: FAIL with "Cannot find module '@/lib/heroEvents'"

### Step 3: Write the implementation

Create `/mnt/c/Users/micha/Projects/blah_read/lib/heroEvents.ts`:

```typescript
/**
 * Hero Events Detection
 *
 * Detects notable events from a session that deserve celebration.
 * Events are prioritized so the most important one can be shown as the "hero moment".
 */

import { SessionRewardResult } from './sessionRewards';
import { Genre } from './genres';
import { Companion } from './types';

export type HeroEventType =
  | 'companion_unlocked'
  | 'slot_unlocked'
  | 'bonus_drop'
  | 'player_level_up'
  | 'genre_threshold'
  | 'streak_threshold'
  | 'book_level_up'
  | 'genre_level_up';

export interface HeroEvent {
  type: HeroEventType;
  priority: number;
  data: Record<string, unknown>;
}

/**
 * Priority order for hero events (lower = more important)
 * 1. Companion unlocked - rarest, most exciting
 * 2. Slot unlocked - major progression milestone
 * 3. Bonus drop - rare occurrence
 * 4. Player level up - global progression
 * 5. Genre threshold (10/20) - unlocks new companion rarities
 * 6. Streak threshold (7 days) - XP multiplier unlocked
 * 7. Book level up - common but satisfying
 * 8. Genre level up - incremental progress
 */
export const HERO_EVENT_PRIORITY: Record<HeroEventType, number> = {
  companion_unlocked: 1,
  slot_unlocked: 2,
  bonus_drop: 3,
  player_level_up: 4,
  genre_threshold: 5,
  streak_threshold: 6,
  book_level_up: 7,
  genre_level_up: 8,
};

/**
 * Genre level thresholds that unlock new companion rarities
 */
const GENRE_THRESHOLDS = [10, 20];

/**
 * Streak threshold that unlocks 1.5x multiplier
 */
const STREAK_THRESHOLD = 7;

/**
 * Detect all hero-worthy events from a session result.
 *
 * @param result - The session reward result
 * @param unlockedCompanions - Companions unlocked during this session
 * @param previousStreak - Streak count before session
 * @param newStreak - Streak count after session
 * @returns Array of hero events sorted by priority (highest first)
 */
export function detectHeroEvents(
  result: SessionRewardResult,
  unlockedCompanions: Companion[],
  previousStreak: number,
  newStreak: number
): HeroEvent[] {
  const events: HeroEvent[] = [];

  // Check companion unlocks (priority 1)
  for (const companion of unlockedCompanions) {
    events.push({
      type: 'companion_unlocked',
      priority: HERO_EVENT_PRIORITY.companion_unlocked,
      data: { companion },
    });
  }

  // Check bonus drop (priority 3)
  if (result.bonusDropTriggered) {
    events.push({
      type: 'bonus_drop',
      priority: HERO_EVENT_PRIORITY.bonus_drop,
      data: {},
    });
  }

  // Check player level up (priority 4)
  const newPlayerLevel = result.updatedProgress?.level ?? result.previousPlayerLevel;
  if (newPlayerLevel > result.previousPlayerLevel) {
    events.push({
      type: 'player_level_up',
      priority: HERO_EVENT_PRIORITY.player_level_up,
      data: {
        previousLevel: result.previousPlayerLevel,
        newLevel: newPlayerLevel,
      },
    });
  }

  // Check genre thresholds and level ups
  for (const [genre, increase] of Object.entries(result.genreLevelIncreases)) {
    if (increase > 0) {
      const previousLevel = result.previousGenreLevels[genre as Genre] ?? 0;
      const newLevel = previousLevel + increase;

      // Check for threshold crossings (priority 5)
      for (const threshold of GENRE_THRESHOLDS) {
        if (previousLevel < threshold && newLevel >= threshold) {
          events.push({
            type: 'genre_threshold',
            priority: HERO_EVENT_PRIORITY.genre_threshold,
            data: { genre, threshold, newLevel },
          });
        }
      }

      // Regular genre level up (priority 8)
      events.push({
        type: 'genre_level_up',
        priority: HERO_EVENT_PRIORITY.genre_level_up,
        data: { genre, previousLevel, newLevel },
      });
    }
  }

  // Check streak threshold (priority 6)
  if (previousStreak < STREAK_THRESHOLD && newStreak >= STREAK_THRESHOLD) {
    events.push({
      type: 'streak_threshold',
      priority: HERO_EVENT_PRIORITY.streak_threshold,
      data: { streak: newStreak, multiplier: 1.5 },
    });
  }

  // Check book level up (priority 7)
  if (result.bookLevelsGained > 0) {
    events.push({
      type: 'book_level_up',
      priority: HERO_EVENT_PRIORITY.book_level_up,
      data: {
        previousLevel: result.previousBookLevel,
        newLevel: result.newBookLevel,
      },
    });
  }

  // Sort by priority (lower number = higher priority = first in array)
  return events.sort((a, b) => a.priority - b.priority);
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --testPathPattern="heroEvents"`
Expected: PASS

### Step 5: Commit

```bash
git add lib/heroEvents.ts __tests__/lib/heroEvents.test.ts
git commit -m "feat(session): add hero events detection logic"
```

---

## Task 3: Create Next Milestone Calculator

**Files:**
- Create: `/mnt/c/Users/micha/Projects/blah_read/lib/nextMilestone.ts`
- Create: `/mnt/c/Users/micha/Projects/blah_read/__tests__/lib/nextMilestone.test.ts`

### Step 1: Write the failing tests

Create `/mnt/c/Users/micha/Projects/blah_read/__tests__/lib/nextMilestone.test.ts`:

```typescript
import {
  NextMilestone,
  calculateNextMilestones,
} from '@/lib/nextMilestone';
import { Book, UserProgress } from '@/lib/types';
import { Genre, GENRES } from '@/lib/genres';

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
      const book = createMockBook({ normalizedGenres: ['fantasy'] as Genre[] });
      const progress = createMockProgress({
        genreLevels: { fantasy: 8 } as Record<Genre, number>,
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
      const book = createMockBook({ normalizedGenres: ['fantasy'] as Genre[] });
      const progress = createMockProgress({
        genreLevels: { fantasy: 18 } as Record<Genre, number>,
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
        const prevRemaining = milestones[i - 1].remainingMinutes ?? milestones[i - 1].data?.levelsNeeded ?? 0;
        const currRemaining = milestones[i].remainingMinutes ?? milestones[i].data?.levelsNeeded ?? 0;
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
```

### Step 2: Run test to verify it fails

Run: `npm test -- --testPathPattern="nextMilestone"`
Expected: FAIL with "Cannot find module '@/lib/nextMilestone'"

### Step 3: Write the implementation

Create `/mnt/c/Users/micha/Projects/blah_read/lib/nextMilestone.ts`:

```typescript
/**
 * Next Milestone Calculator
 *
 * Calculates the nearest reward-giving milestones for the current book.
 */

import { Book, UserProgress } from './types';
import { Genre } from './genres';
import { SECONDS_PER_LEVEL } from './bookLeveling';
import { READING_TIME_MILESTONES, getNextMilestone } from './companionUnlock';

export type MilestoneType = 'book_level' | 'companion_unlock' | 'genre_rarity';
export type MilestoneReward = 'loot_box' | 'companion' | 'rarity_unlock';

export interface NextMilestone {
  type: MilestoneType;
  reward: MilestoneReward;
  remainingMinutes?: number;
  progress?: number; // 0-1 progress toward milestone
  data?: Record<string, unknown>;
}

/**
 * Genre level thresholds that unlock new companion rarities
 */
const GENRE_THRESHOLDS = [10, 20];

/**
 * Calculate the nearest reward-giving milestones.
 * Returns up to 2 milestones, sorted by proximity.
 */
export function calculateNextMilestones(
  book: Book,
  progress: UserProgress
): NextMilestone[] {
  const milestones: NextMilestone[] = [];
  const bookGenres = book.normalizedGenres || [];

  // 1. Next book level (gives loot box)
  const currentSeconds = book.progression?.totalSeconds ?? book.totalReadingTime;
  const currentLevel = book.progression?.level ?? 0;
  const secondsToNextLevel = ((currentLevel + 1) * SECONDS_PER_LEVEL) - currentSeconds;

  if (secondsToNextLevel > 0) {
    const progressInLevel = (currentSeconds % SECONDS_PER_LEVEL) / SECONDS_PER_LEVEL;
    milestones.push({
      type: 'book_level',
      reward: 'loot_box',
      remainingMinutes: Math.ceil(secondsToNextLevel / 60),
      progress: progressInLevel,
      data: { nextLevel: currentLevel + 1 },
    });
  }

  // 2. Next companion unlock milestone
  const nextCompanionMilestone = getNextMilestone(book.totalReadingTime);
  if (nextCompanionMilestone) {
    const remainingSeconds = nextCompanionMilestone.timeRemaining;
    const milestoneSeconds = READING_TIME_MILESTONES[nextCompanionMilestone.index];
    const progressToMilestone = book.totalReadingTime / milestoneSeconds;

    milestones.push({
      type: 'companion_unlock',
      reward: 'companion',
      remainingMinutes: Math.ceil(remainingSeconds / 60),
      progress: progressToMilestone,
      data: { milestoneIndex: nextCompanionMilestone.index },
    });
  }

  // 3. Genre rarity unlocks (level 10 and 20)
  const genreLevels = progress.genreLevels || {};

  for (const genre of bookGenres) {
    const currentGenreLevel = genreLevels[genre] ?? 0;

    for (const threshold of GENRE_THRESHOLDS) {
      if (currentGenreLevel < threshold) {
        const levelsNeeded = threshold - currentGenreLevel;
        const progressToThreshold = currentGenreLevel / threshold;

        milestones.push({
          type: 'genre_rarity',
          reward: 'rarity_unlock',
          progress: progressToThreshold,
          data: {
            genre,
            threshold,
            levelsNeeded,
            currentLevel: currentGenreLevel,
          },
        });
        break; // Only show nearest threshold per genre
      }
    }
  }

  // Sort by proximity (time-based first, then level-based)
  milestones.sort((a, b) => {
    const aRemaining = a.remainingMinutes ?? (a.data?.levelsNeeded as number ?? 999) * 60;
    const bRemaining = b.remainingMinutes ?? (b.data?.levelsNeeded as number ?? 999) * 60;
    return aRemaining - bRemaining;
  });

  // Return top 2
  return milestones.slice(0, 2);
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --testPathPattern="nextMilestone"`
Expected: PASS

### Step 5: Commit

```bash
git add lib/nextMilestone.ts __tests__/lib/nextMilestone.test.ts
git commit -m "feat(session): add next milestone calculator"
```

---

## Task 4: Create Session Results Data Aggregator

**Files:**
- Create: `/mnt/c/Users/micha/Projects/blah_read/lib/sessionResultsData.ts`
- Create: `/mnt/c/Users/micha/Projects/blah_read/__tests__/lib/sessionResultsData.test.ts`

### Step 1: Write the failing tests

Create `/mnt/c/Users/micha/Projects/blah_read/__tests__/lib/sessionResultsData.test.ts`:

```typescript
import {
  SessionResultsData,
  buildSessionResultsData,
} from '@/lib/sessionResultsData';
import { SessionRewardResult } from '@/lib/sessionRewards';
import { Book, UserProgress, Companion } from '@/lib/types';
import { Genre, GENRES } from '@/lib/genres';

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
    bonusDropTriggered: false,
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
      const data = buildSessionResultsData(result, 1800, [], 2, 3);

      expect(data.sessionMinutes).toBe(30);
    });

    it('should calculate loot box breakdown by source', () => {
      const result = createMockSessionResult({
        lootBoxes: [
          { id: 'lb1', earnedAt: Date.now(), source: 'level_up' },
          { id: 'lb2', earnedAt: Date.now(), source: 'level_up' },
          { id: 'lb3', earnedAt: Date.now(), source: 'bonus_drop' },
        ],
        bonusDropTriggered: true,
      });

      const data = buildSessionResultsData(result, 3600, [], 0, 0);

      expect(data.lootBoxBreakdown.levelUp).toBe(2);
      expect(data.lootBoxBreakdown.bonusDrop).toBe(1);
      expect(data.lootBoxBreakdown.completion).toBe(0);
    });

    it('should include hero events sorted by priority', () => {
      const result = createMockSessionResult({
        bonusDropTriggered: true,
        bookLevelsGained: 1,
      });

      const data = buildSessionResultsData(result, 3600, [], 0, 0);

      expect(data.heroEvents.length).toBeGreaterThan(0);
      expect(data.heroEvents[0].type).toBe('bonus_drop'); // Higher priority than book_level_up
    });

    it('should include next milestones', () => {
      const result = createMockSessionResult();
      const data = buildSessionResultsData(result, 1800, [], 0, 0);

      expect(data.nextMilestones.length).toBeGreaterThan(0);
    });

    it('should calculate total boost multiplier', () => {
      const result = createMockSessionResult({
        activeEffects: { xpBoost: 0.25, luck: 0, rareLuck: 0, legendaryLuck: 0, dropRateBoost: 0, completionBonus: 0 },
        streakMultiplier: 1.2,
      });

      const data = buildSessionResultsData(result, 3600, [], 0, 0);

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

      const data = buildSessionResultsData(result, 3600, [], 0, 0);

      expect(data.lootBoxOdds.luck).toBe(0.15);
      expect(data.lootBoxOdds.rareLuck).toBe(0.10);
      expect(data.lootBoxOdds.pityCounter).toBe(5);
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- --testPathPattern="sessionResultsData"`
Expected: FAIL with "Cannot find module '@/lib/sessionResultsData'"

### Step 3: Write the implementation

Create `/mnt/c/Users/micha/Projects/blah_read/lib/sessionResultsData.ts`:

```typescript
/**
 * Session Results Data Aggregator
 *
 * Builds the complete data structure needed by the SessionResultsScreen.
 */

import { SessionRewardResult } from './sessionRewards';
import { Companion } from './types';
import { HeroEvent, detectHeroEvents } from './heroEvents';
import { NextMilestone, calculateNextMilestones } from './nextMilestone';

export interface LootBoxBreakdown {
  total: number;
  levelUp: number;
  bonusDrop: number;
  completion: number;
}

export interface LootBoxOdds {
  luck: number;
  rareLuck: number;
  legendaryLuck: number;
  pityCounter: number;
}

export interface SessionResultsData {
  // Core rewards
  xpGained: number;
  baseXpBeforeBoosts: number;
  totalBoostMultiplier: number;
  streakMultiplier: number;
  sessionMinutes: number;

  // Loot boxes
  lootBoxBreakdown: LootBoxBreakdown;

  // Progress transitions
  bookLevel: { previous: number; current: number };
  playerLevel: { previous: number; current: number };
  genreLevels: Array<{ genre: string; previous: number; current: number }>;

  // Hero events (sorted by priority)
  heroEvents: HeroEvent[];

  // Next milestones
  nextMilestones: NextMilestone[];

  // Active effects for detail view
  activeEffects: {
    xpBoost: number;
    luck: number;
    rareLuck: number;
    legendaryLuck: number;
    dropRateBoost: number;
  };

  // Loot box odds for detail view
  lootBoxOdds: LootBoxOdds;
}

/**
 * Build the complete session results data structure.
 */
export function buildSessionResultsData(
  result: SessionRewardResult,
  sessionSeconds: number,
  unlockedCompanions: Companion[],
  previousStreak: number,
  newStreak: number
): SessionResultsData {
  // Calculate loot box breakdown
  const lootBoxBreakdown: LootBoxBreakdown = {
    total: result.lootBoxes.length,
    levelUp: result.lootBoxes.filter(lb => lb.source === 'level_up').length,
    bonusDrop: result.lootBoxes.filter(lb => lb.source === 'bonus_drop').length,
    completion: result.lootBoxes.filter(lb => lb.source === 'completion').length,
  };

  // Build genre level transitions
  const genreLevels: Array<{ genre: string; previous: number; current: number }> = [];
  for (const [genre, increase] of Object.entries(result.genreLevelIncreases)) {
    if (increase > 0) {
      const previous = result.previousGenreLevels[genre as keyof typeof result.previousGenreLevels] ?? 0;
      genreLevels.push({
        genre,
        previous,
        current: previous + increase,
      });
    }
  }

  // Calculate total boost multiplier
  const xpBoostMultiplier = 1 + result.activeEffects.xpBoost;
  const totalBoostMultiplier = xpBoostMultiplier * result.streakMultiplier;

  // Detect hero events
  const heroEvents = detectHeroEvents(result, unlockedCompanions, previousStreak, newStreak);

  // Calculate next milestones
  const nextMilestones = calculateNextMilestones(result.updatedBook, result.updatedProgress);

  // Get current pity counter
  const pityCounter = result.updatedProgress.goldPityCounter ?? 0;

  return {
    xpGained: result.xpGained,
    baseXpBeforeBoosts: result.baseXpBeforeBoosts,
    totalBoostMultiplier,
    streakMultiplier: result.streakMultiplier,
    sessionMinutes: Math.floor(sessionSeconds / 60),

    lootBoxBreakdown,

    bookLevel: {
      previous: result.previousBookLevel,
      current: result.newBookLevel,
    },
    playerLevel: {
      previous: result.previousPlayerLevel,
      current: result.updatedProgress.level ?? result.previousPlayerLevel,
    },
    genreLevels,

    heroEvents,
    nextMilestones,

    activeEffects: {
      xpBoost: result.activeEffects.xpBoost,
      luck: result.activeEffects.luck,
      rareLuck: result.activeEffects.rareLuck,
      legendaryLuck: result.activeEffects.legendaryLuck,
      dropRateBoost: result.activeEffects.dropRateBoost,
    },

    lootBoxOdds: {
      luck: result.activeEffects.luck,
      rareLuck: result.activeEffects.rareLuck,
      legendaryLuck: result.activeEffects.legendaryLuck,
      pityCounter,
    },
  };
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --testPathPattern="sessionResultsData"`
Expected: PASS

### Step 5: Commit

```bash
git add lib/sessionResultsData.ts __tests__/lib/sessionResultsData.test.ts
git commit -m "feat(session): add session results data aggregator"
```

---

## Task 5: Create SessionResultsScreen Component

**Files:**
- Create: `/mnt/c/Users/micha/Projects/blah_read/components/SessionResultsScreen.tsx`

### Step 1: Create the component

Create `/mnt/c/Users/micha/Projects/blah_read/components/SessionResultsScreen.tsx`:

```typescript
/**
 * Session Results Screen Component
 *
 * Displays session rewards in a layered format:
 * 1. Hero moment (if any notable event)
 * 2. Rewards earned
 * 3. Progress made
 * 4. Next milestone
 * 5. Expandable details
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { SessionResultsData } from '@/lib/sessionResultsData';
import { HeroEvent } from '@/lib/heroEvents';

interface Props {
  data: SessionResultsData;
  bookTitle: string;
  onContinue: () => void;
}

export function SessionResultsScreen({ data, bookTitle, onContinue }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const styles = createStyles(colors, spacing, fontSize);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const topHeroEvent = data.heroEvents[0] ?? null;
  const hasBoost = data.totalBoostMultiplier > 1;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero Moment */}
        {topHeroEvent && (
          <View style={styles.heroSection}>
            <HeroMoment event={topHeroEvent} colors={colors} fontSize={fontSize} />
          </View>
        )}

        {/* Rewards Earned */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>rewards earned</Text>
          <View style={styles.rewardsRow}>
            {data.lootBoxBreakdown.total > 0 && (
              <View style={styles.rewardItem}>
                <Text style={styles.rewardValue}>{data.lootBoxBreakdown.total}</Text>
                <Text style={styles.rewardLabel}>
                  loot box{data.lootBoxBreakdown.total !== 1 ? 'es' : ''}
                </Text>
                {data.lootBoxBreakdown.bonusDrop > 0 && (
                  <Text style={styles.bonusIndicator}>+bonus drop!</Text>
                )}
              </View>
            )}
            <View style={styles.rewardItem}>
              <Text style={styles.rewardValue}>+{data.xpGained}</Text>
              <Text style={styles.rewardLabel}>
                xp{hasBoost && ` (${data.totalBoostMultiplier.toFixed(2)}x)`}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Made */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>progress made</Text>

          {/* Book Level */}
          {data.bookLevel.current > data.bookLevel.previous ? (
            <Text style={styles.progressItem}>
              book level {data.bookLevel.previous} → {data.bookLevel.current}
            </Text>
          ) : (
            <Text style={styles.progressItemMuted}>
              book level {data.bookLevel.current} (no change)
            </Text>
          )}

          {/* Player Level */}
          {data.playerLevel.current > data.playerLevel.previous && (
            <Text style={styles.progressItem}>
              player level {data.playerLevel.previous} → {data.playerLevel.current}
            </Text>
          )}

          {/* Genre Levels */}
          {data.genreLevels.length > 0 && (
            <Text style={styles.progressItem}>
              {data.genreLevels
                .slice(0, 2)
                .map(g => `${g.genre} +${g.current - g.previous}`)
                .join(', ')}
              {data.genreLevels.length > 2 && `, +${data.genreLevels.length - 2} more`}
            </Text>
          )}

          {/* No progress message */}
          {data.bookLevel.current === data.bookLevel.previous &&
            data.genreLevels.length === 0 && (
              <Text style={styles.progressItemMuted}>
                keep reading to earn your next level!
              </Text>
            )}
        </View>

        {/* Next Milestone */}
        {data.nextMilestones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>next milestone</Text>
            {data.nextMilestones.slice(0, 2).map((milestone, index) => (
              <MilestoneRow key={index} milestone={milestone} colors={colors} fontSize={fontSize} />
            ))}
          </View>
        )}

        {/* Expandable Details */}
        <Pressable
          style={styles.detailsToggle}
          onPress={() => setDetailsExpanded(!detailsExpanded)}
        >
          <Text style={styles.detailsToggleText}>
            {detailsExpanded ? '▼ hide details' : '▶ see details'}
          </Text>
        </Pressable>

        {detailsExpanded && (
          <View style={styles.detailsSection}>
            {/* Effect Breakdown */}
            <Text style={styles.detailsHeading}>active boosts</Text>
            <Text style={styles.detailsText}>
              xp: {data.activeEffects.xpBoost > 0 ? `+${(data.activeEffects.xpBoost * 100).toFixed(0)}%` : 'none'}
            </Text>
            <Text style={styles.detailsText}>
              luck: {data.activeEffects.luck > 0 ? `+${(data.activeEffects.luck * 100).toFixed(0)}%` : 'none'}
            </Text>
            {data.streakMultiplier > 1 && (
              <Text style={styles.detailsText}>
                streak: {data.streakMultiplier}x
              </Text>
            )}

            {/* XP Calculation */}
            <Text style={styles.detailsHeading}>xp calculation</Text>
            <Text style={styles.detailsText}>
              {data.sessionMinutes} min × 10 xp/min = {data.sessionMinutes * 10} base xp
            </Text>
            {data.streakMultiplier > 1 && (
              <Text style={styles.detailsText}>
                × {data.streakMultiplier} streak bonus
              </Text>
            )}
            {data.activeEffects.xpBoost > 0 && (
              <Text style={styles.detailsText}>
                × {(1 + data.activeEffects.xpBoost).toFixed(2)} boost multiplier
              </Text>
            )}
            <Text style={styles.detailsText}>= {data.xpGained} xp earned</Text>

            {/* Loot Box Odds */}
            <Text style={styles.detailsHeading}>current loot box odds</Text>
            <Text style={styles.detailsText}>
              luck: {(data.lootBoxOdds.luck * 100).toFixed(0)}%
            </Text>
            <Text style={styles.detailsText}>
              pity counter: {data.lootBoxOdds.pityCounter} (gold guaranteed in {25 - data.lootBoxOdds.pityCounter})
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <Pressable style={styles.continueButton} onPress={onContinue}>
          <Text style={styles.continueButtonText}>[continue]</Text>
        </Pressable>
      </View>
    </View>
  );
}

function HeroMoment({
  event,
  colors,
  fontSize,
}: {
  event: HeroEvent;
  colors: ReturnType<typeof useTheme>['colors'];
  fontSize: ReturnType<typeof useTheme>['fontSize'];
}) {
  const heroText = getHeroText(event);

  return (
    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
      <Text
        style={{
          fontFamily: FONTS.mono,
          fontSize: fontSize('title'),
          color: colors.primary,
          textAlign: 'center',
        }}
      >
        {heroText}
      </Text>
    </View>
  );
}

function getHeroText(event: HeroEvent): string {
  switch (event.type) {
    case 'companion_unlocked':
      return `you discovered ${(event.data.companion as { name: string }).name}!`;
    case 'slot_unlocked':
      return `slot ${event.data.slot} unlocked!`;
    case 'bonus_drop':
      return 'lucky find!';
    case 'player_level_up':
      return `level ${event.data.newLevel}!`;
    case 'genre_threshold':
      return `${event.data.genre} level ${event.data.threshold}!`;
    case 'streak_threshold':
      return `${event.data.streak}-day streak! ${event.data.multiplier}x xp`;
    case 'book_level_up':
      return `book level ${event.data.newLevel}!`;
    case 'genre_level_up':
      return `${event.data.genre} level ${event.data.newLevel}!`;
    default:
      return '';
  }
}

function MilestoneRow({
  milestone,
  colors,
  fontSize,
}: {
  milestone: SessionResultsData['nextMilestones'][0];
  colors: ReturnType<typeof useTheme>['colors'];
  fontSize: ReturnType<typeof useTheme>['fontSize'];
}) {
  const progress = milestone.progress ?? 0;
  const progressPercent = Math.min(progress * 100, 100);

  let label = '';
  let remaining = '';

  switch (milestone.type) {
    case 'book_level':
      label = 'next loot box';
      remaining = `${milestone.remainingMinutes} min`;
      break;
    case 'companion_unlock':
      label = 'next companion';
      remaining = `${milestone.remainingMinutes} min`;
      break;
    case 'genre_rarity':
      label = `${milestone.data?.genre} rarity unlock`;
      remaining = `${milestone.data?.levelsNeeded} levels`;
      break;
  }

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontFamily: FONTS.mono, fontSize: fontSize('body'), color: colors.text }}>
          {label}
        </Text>
        <Text style={{ fontFamily: FONTS.mono, fontSize: fontSize('body'), color: colors.textSecondary }}>
          {remaining}
        </Text>
      </View>
      <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4 }}>
        <View
          style={{
            height: 8,
            width: `${progressPercent}%`,
            backgroundColor: colors.primary,
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize']
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing(4),
    },
    heroSection: {
      marginBottom: spacing(6),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: spacing(4),
    },
    section: {
      marginBottom: spacing(5),
    },
    sectionTitle: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing(2),
    },
    rewardsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    rewardItem: {
      alignItems: 'center',
    },
    rewardValue: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('title'),
      color: colors.text,
    },
    rewardLabel: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: colors.textSecondary,
    },
    bonusIndicator: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: colors.primary,
      marginTop: spacing(1),
    },
    progressItem: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: colors.text,
      marginBottom: spacing(1),
    },
    progressItemMuted: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    detailsToggle: {
      paddingVertical: spacing(3),
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    detailsToggleText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: colors.textSecondary,
    },
    detailsSection: {
      paddingTop: spacing(2),
    },
    detailsHeading: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: spacing(3),
      marginBottom: spacing(1),
    },
    detailsText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: colors.text,
      marginBottom: spacing(0.5),
    },
    footer: {
      padding: spacing(4),
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    continueButton: {
      padding: spacing(3),
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    continueButtonText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: colors.primary,
    },
  });
```

### Step 2: Commit

```bash
git add components/SessionResultsScreen.tsx
git commit -m "feat(ui): add SessionResultsScreen component"
```

---

## Task 6: Create Session Results Route

**Files:**
- Create: `/mnt/c/Users/micha/Projects/blah_read/app/session-results.tsx`

### Step 1: Create the route

Create `/mnt/c/Users/micha/Projects/blah_read/app/session-results.tsx`:

```typescript
/**
 * Session Results Route
 *
 * Displays the session results screen after a reading session ends.
 * Receives data via route params and displays the SessionResultsScreen.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SessionResultsScreen } from '@/components/SessionResultsScreen';
import { SessionResultsData } from '@/lib/sessionResultsData';
import { useTheme } from '@/lib/ThemeContext';

export default function SessionResultsRoute() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    data: string;
    bookTitle: string;
  }>();

  // Parse the serialized data
  const data: SessionResultsData = JSON.parse(params.data || '{}');
  const bookTitle = params.bookTitle || 'Unknown Book';

  const handleContinue = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SessionResultsScreen
        data={data}
        bookTitle={bookTitle}
        onContinue={handleContinue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### Step 2: Commit

```bash
git add app/session-results.tsx
git commit -m "feat(ui): add session-results route"
```

---

## Task 7: Integrate with Timer Screen

**Files:**
- Modify: `/mnt/c/Users/micha/Projects/blah_read/app/timer/[bookId].tsx`

### Step 1: Read the current timer implementation

Read the file to understand the current `handleEnd` function structure.

### Step 2: Modify handleEnd to navigate to results screen

In `/mnt/c/Users/micha/Projects/blah_read/app/timer/[bookId].tsx`, update the `handleEnd` function:

**Add imports at top:**

```typescript
import { buildSessionResultsData } from '@/lib/sessionResultsData';
```

**Replace the Alert.alert call with navigation:**

Find this pattern (approximately lines 237-241):

```typescript
Alert.alert('Session Complete', `+${rewards.xpGained} XP\n${notifications}`);
```

Replace with:

```typescript
// Build session results data
const resultsData = buildSessionResultsData(
  rewards,
  timerState.elapsed,
  unlockResult?.unlockedCompanions ?? [],
  previousStreak,
  newStreak
);

// Navigate to results screen
router.push({
  pathname: '/session-results',
  params: {
    data: JSON.stringify(resultsData),
    bookTitle: book.title,
  },
});
```

**Capture previous streak before updating:**

Before the streak update logic, add:

```typescript
const previousStreak = progress.currentStreak;
```

After streak is updated, capture the new value:

```typescript
const newStreak = updatedProgress.currentStreak;
```

### Step 3: Test manually

Run: `npm start`
- Start a reading session
- End the session
- Verify results screen appears instead of alert
- Verify all sections display correctly
- Verify "continue" returns to previous screen

### Step 4: Commit

```bash
git add app/timer/[bookId].tsx
git commit -m "feat(ui): integrate session results screen with timer"
```

---

## Task 8: Add Slot Unlock Detection to Hero Events

**Files:**
- Modify: `/mnt/c/Users/micha/Projects/blah_read/lib/heroEvents.ts`
- Modify: `/mnt/c/Users/micha/Projects/blah_read/__tests__/lib/heroEvents.test.ts`

### Step 1: Write the failing test

Add to `__tests__/lib/heroEvents.test.ts`:

```typescript
it('should detect slot unlock', () => {
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
```

### Step 2: Run test to verify it fails

Run: `npm test -- --testPathPattern="heroEvents" --testNamePattern="slot unlock"`
Expected: FAIL

### Step 3: Update implementation

Update `detectHeroEvents` signature and add slot detection:

```typescript
export interface SlotUnlockState {
  previousSlot2?: boolean;
  currentSlot2?: boolean;
  previousSlot3?: boolean;
  currentSlot3?: boolean;
}

export function detectHeroEvents(
  result: SessionRewardResult,
  unlockedCompanions: Companion[],
  previousStreak: number,
  newStreak: number,
  slotState?: SlotUnlockState
): HeroEvent[] {
  const events: HeroEvent[] = [];

  // ... existing companion check ...

  // Check slot unlocks (priority 2)
  if (slotState) {
    if (!slotState.previousSlot2 && slotState.currentSlot2) {
      events.push({
        type: 'slot_unlocked',
        priority: HERO_EVENT_PRIORITY.slot_unlocked,
        data: { slot: 2 },
      });
    }
    if (!slotState.previousSlot3 && slotState.currentSlot3) {
      events.push({
        type: 'slot_unlocked',
        priority: HERO_EVENT_PRIORITY.slot_unlocked,
        data: { slot: 3 },
      });
    }
  }

  // ... rest of existing code ...
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --testPathPattern="heroEvents"`
Expected: PASS

### Step 5: Commit

```bash
git add lib/heroEvents.ts __tests__/lib/heroEvents.test.ts
git commit -m "feat(session): add slot unlock detection to hero events"
```

---

## Task 9: Run All Tests

### Step 1: Run full test suite

Run: `npm test`
Expected: All tests pass

### Step 2: Fix any failures

If any tests fail, fix them before proceeding.

### Step 3: Commit any fixes

```bash
git add -A
git commit -m "fix: resolve test failures from session results integration"
```

---

## Task 10: Final Integration Test

### Step 1: Manual testing checklist

Test each scenario:

- [ ] Short session (< 1 hour): No level up, shows "keep reading" message
- [ ] Level up session: Hero moment shows book level up
- [ ] Bonus drop session: Hero moment shows "Lucky Find!"
- [ ] Multiple events: Highest priority shown as hero
- [ ] Genre level up: Shows in progress section
- [ ] Player level up: Shows in progress and as hero
- [ ] Expandable details: Toggle works, shows calculations
- [ ] Next milestones: Progress bars display correctly
- [ ] Continue button: Returns to previous screen

### Step 2: Commit final state

```bash
git add -A
git commit -m "feat(session): complete session results screen implementation"
```

---

## Summary

This implementation plan creates:

1. **Extended SessionRewardResult** with previous state for transitions
2. **Hero events detection** with priority ordering
3. **Next milestone calculator** for motivation
4. **Session results data aggregator** combining all data
5. **SessionResultsScreen component** with layered UI
6. **Route integration** replacing the Alert popup
7. **Slot unlock detection** for the hero system

All changes follow TDD, use existing patterns, and maintain the codebase's monospace typewriter aesthetic.
