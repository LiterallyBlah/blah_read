# Rewards System Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix four issues in the V3 rewards system: missing streak multiplier, inconsistent consumable duration, genre level inflation, and incomplete book finish flow.

**Architecture:** Minimal surgical fixes to existing code. Each fix is isolated and independently testable. TDD approach - write failing tests first, then implement.

**Tech Stack:** TypeScript, React Native, Jest

---

## Task 1: Add Streak Multiplier to V3 Session Rewards

The V3 `sessionRewards.ts` calculates XP but doesn't apply the streak multiplier from `xp.ts`. The streak multiplier (1.2x at 3+ days, 1.5x at 7+ days) should stack with companion/consumable boosts.

**Files:**
- Modify: `lib/sessionRewards.ts:92-137`
- Modify: `__tests__/lib/sessionRewards.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/sessionRewards.test.ts` in a new describe block:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=sessionRewards.test.ts --testNamePattern="streak multiplier"`
Expected: FAIL - tests expect streak multiplier but it's not implemented

**Step 3: Write minimal implementation**

In `lib/sessionRewards.ts`, add import at top:

```typescript
import { getStreakMultiplier } from './xp';
```

Then modify the XP calculation (around line 134-137):

```typescript
  // Step 6: Calculate XP (BASE_XP_PER_MINUTE=10, apply boost and streak)
  const minutes = sessionSeconds / 60;
  const streakMultiplier = getStreakMultiplier(progress.currentStreak);
  const baseXp = Math.round(minutes * BASE_XP_PER_MINUTE * streakMultiplier);
  const xpGained = Math.round(baseXp * (1 + totalXpBoost));
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=sessionRewards.test.ts --testNamePattern="streak multiplier"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/sessionRewards.ts __tests__/lib/sessionRewards.test.ts
git commit -m "$(cat <<'EOF'
feat(rewards): add streak multiplier to V3 session rewards

Integrate getStreakMultiplier from xp.ts into processSessionEnd.
Streak bonus (1.2x at 3+ days, 1.5x at 7+ days) now stacks
multiplicatively with companion/consumable XP boosts.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Fix Consumable Duration Tracking

Currently consumables tick by 1 per session regardless of session length. A 5-minute session costs the same as a 2-hour session. Change to time-based duration tracking.

**Design Decision:** Change `remainingDuration` from "sessions remaining" to "minutes remaining". Consumables with duration in sessions will be converted: duration * 60 minutes = duration in minutes.

**Files:**
- Modify: `lib/types.ts:110-114`
- Modify: `lib/consumables.ts:18-41`
- Modify: `lib/consumableManager.ts:82-89`
- Modify: `__tests__/lib/consumableManager.test.ts`

**Step 1: Write the failing tests**

Add to `__tests__/lib/consumableManager.test.ts`:

```typescript
describe('tickConsumables with minutes', () => {
  it('should decrement duration by session minutes', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'weak_xp_1', remainingDuration: 60, appliedAt: Date.now() },
    ];
    const result = tickConsumables(active, 30); // 30 minute session
    expect(result.length).toBe(1);
    expect(result[0].remainingDuration).toBe(30);
  });

  it('should remove consumable when minutes exceed remaining duration', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'weak_xp_1', remainingDuration: 20, appliedAt: Date.now() },
    ];
    const result = tickConsumables(active, 30); // 30 minute session
    expect(result.length).toBe(0);
  });

  it('should handle fractional minutes correctly', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'med_luck_1', remainingDuration: 180, appliedAt: Date.now() },
    ];
    // 45-minute session
    const result = tickConsumables(active, 45);
    expect(result[0].remainingDuration).toBe(135);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=consumableManager.test.ts --testNamePattern="tickConsumables with minutes"`
Expected: FAIL - tickConsumables doesn't accept session minutes parameter

**Step 3: Update consumables.ts definitions**

Change `duration` comments and values from sessions to minutes:

```typescript
export interface ConsumableDefinition {
  id: string;
  name: string;
  description: string;
  tier: ConsumableTier;
  effectType: ConsumableEffectType;
  magnitude: number;
  duration: number; // Duration in minutes, 0 = instant
}

export const CONSUMABLES: ConsumableDefinition[] = [
  // Weak (Wood box tier) - ~1 hour durations
  { id: 'weak_xp_1', name: 'Minor XP Scroll', description: '+10% XP for 60 min', tier: 'weak', effectType: 'xp_boost', magnitude: 0.10, duration: 60 },
  { id: 'weak_luck_1', name: 'Lucky Penny', description: '+5% luck for 2 hours', tier: 'weak', effectType: 'luck_boost', magnitude: 0.05, duration: 120 },
  { id: 'weak_drop_1', name: 'Treasure Map Scrap', description: '+10% drop rate for 60 min', tier: 'weak', effectType: 'drop_rate_boost', magnitude: 0.10, duration: 60 },
  { id: 'weak_streak_1', name: 'Calendar Page', description: '1-day streak shield', tier: 'weak', effectType: 'streak_shield', magnitude: 1, duration: 0 },

  // Medium (Silver box tier) - ~2-3 hour durations
  { id: 'med_xp_1', name: 'XP Scroll', description: '+25% XP for 90 min', tier: 'medium', effectType: 'xp_boost', magnitude: 0.25, duration: 90 },
  { id: 'med_luck_1', name: 'Four-Leaf Clover', description: '+15% luck for 3 hours', tier: 'medium', effectType: 'luck_boost', magnitude: 0.15, duration: 180 },
  { id: 'med_drop_1', name: 'Treasure Map', description: '+20% drop rate for 2 hours', tier: 'medium', effectType: 'drop_rate_boost', magnitude: 0.20, duration: 120 },
  { id: 'med_streak_1', name: 'Calendar', description: '3-day streak shield', tier: 'medium', effectType: 'streak_shield', magnitude: 3, duration: 0 },
  { id: 'med_upgrade_1', name: 'Polish Kit', description: 'Upgrade next box tier', tier: 'medium', effectType: 'box_upgrade', magnitude: 1, duration: 0 },

  // Strong (Gold box tier) - ~4-5 hour durations
  { id: 'strong_xp_1', name: 'Double XP Tome', description: 'Double XP for 90 min', tier: 'strong', effectType: 'xp_boost', magnitude: 1.0, duration: 90 },
  { id: 'strong_xp_2', name: 'XP Blessing', description: '+50% XP for 4 hours', tier: 'strong', effectType: 'xp_boost', magnitude: 0.50, duration: 240 },
  { id: 'strong_luck_1', name: 'Luck Charm', description: '+30% luck for 5 hours', tier: 'strong', effectType: 'luck_boost', magnitude: 0.30, duration: 300 },
  { id: 'strong_companion_1', name: 'Companion Summon', description: 'Guaranteed companion on next box', tier: 'strong', effectType: 'guaranteed_companion', magnitude: 1, duration: 0 },
  { id: 'strong_level_1', name: 'Time Warp', description: 'Instant level up on current book', tier: 'strong', effectType: 'instant_level', magnitude: 1, duration: 0 },
];
```

**Step 4: Update consumableManager.ts tickConsumables**

```typescript
/**
 * Tick all consumables, decrementing duration by session minutes and removing expired ones.
 */
export function tickConsumables(active: ActiveConsumable[], sessionMinutes: number): ActiveConsumable[] {
  return active
    .map(c => ({
      ...c,
      remainingDuration: c.remainingDuration - sessionMinutes,
    }))
    .filter(c => c.remainingDuration > 0);
}
```

**Step 5: Update types.ts comment**

```typescript
// Active consumable effect
export interface ActiveConsumable {
  consumableId: string;
  remainingDuration: number; // Minutes remaining
  appliedAt: number; // Timestamp
}
```

**Step 6: Update sessionRewards.ts to pass minutes**

In `lib/sessionRewards.ts`, change line 212:

```typescript
  // Step 11b: Tick consumables (pass session minutes)
  const sessionMinutes = sessionSeconds / 60;
  const tickedConsumables = tickConsumables(activeConsumables, sessionMinutes);
```

**Step 7: Fix existing tests to use minutes**

Update `__tests__/lib/consumableManager.test.ts` existing tests to pass sessionMinutes:

```typescript
describe('tickConsumables', () => {
  it('should decrement duration and remove expired', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'weak_xp_1', remainingDuration: 30, appliedAt: Date.now() },
      { consumableId: 'med_xp_1', remainingDuration: 90, appliedAt: Date.now() },
    ];
    const result = tickConsumables(active, 60); // 60 minute session
    expect(result.length).toBe(1);
    expect(result[0].consumableId).toBe('med_xp_1');
    expect(result[0].remainingDuration).toBe(30);
  });
  // ... update all other tests similarly
});
```

**Step 8: Run all tests**

Run: `npm test -- --testPathPattern="consumable"`
Expected: PASS

**Step 9: Commit**

```bash
git add lib/types.ts lib/consumables.ts lib/consumableManager.ts lib/sessionRewards.ts __tests__/lib/consumableManager.test.ts __tests__/lib/sessionRewards.test.ts
git commit -m "$(cat <<'EOF'
fix(consumables): change duration from sessions to minutes

Consumable duration now tracked in minutes instead of sessions.
A 5-minute session now costs 5 minutes of consumable time, not
a full "session" like a 2-hour session. This makes consumables
feel more fair and predictable.

- Update CONSUMABLES definitions with minute durations
- tickConsumables now accepts sessionMinutes parameter
- sessionRewards passes actual session duration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Normalize Genre Level Distribution

Currently multi-genre books give full level credit to ALL genres. A 5-genre book gives 5x the genre XP of a single-genre book. Change to distribute levels proportionally.

**Design Decision:** Divide level gains evenly across book's genres. 2 levels gained on a 2-genre book = 1 level to each genre.

**Files:**
- Modify: `lib/sessionRewards.ts:139-143`
- Modify: `__tests__/lib/sessionRewards.test.ts`

**Step 1: Write the failing tests**

Add to `__tests__/lib/sessionRewards.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=sessionRewards.test.ts --testNamePattern="genre level distribution"`
Expected: FAIL - currently gives full levels to all genres

**Step 3: Write minimal implementation**

Replace genre level calculation in `lib/sessionRewards.ts`:

```typescript
  // Step 7: Calculate genre level increases (distribute evenly across genres)
  const genreLevelIncreases = createEmptyGenreLevelIncreases();

  if (bookGenres.length > 0 && levelsGained > 0) {
    const basePerGenre = Math.floor(levelsGained / bookGenres.length);
    let remainder = levelsGained % bookGenres.length;

    for (const genre of bookGenres) {
      genreLevelIncreases[genre] = basePerGenre;
      if (remainder > 0) {
        genreLevelIncreases[genre]++;
        remainder--;
      }
    }
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=sessionRewards.test.ts --testNamePattern="genre level distribution"`
Expected: PASS

**Step 5: Update existing tests that assumed old behavior**

Update the tests in `__tests__/lib/sessionRewards.test.ts` under "genre level increases":

```typescript
describe('genre level increases', () => {
  it('should increase genre level for book genres', () => {
    const mockBook = createMockBook({ normalizedGenres: ['fantasy'] });
    const mockProgress = createMockProgress();

    // 1 level = 1 genre level (single genre gets all)
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
```

**Step 6: Run all session rewards tests**

Run: `npm test -- --testPathPattern=sessionRewards.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add lib/sessionRewards.ts __tests__/lib/sessionRewards.test.ts
git commit -m "$(cat <<'EOF'
fix(rewards): distribute genre levels evenly across book genres

Previously, multi-genre books gave full level credit to ALL genres,
inflating progress. Now levels are distributed evenly: a 2-level
gain on a 2-genre book gives 1 level to each genre.

Remainder levels (when division is uneven) are distributed to
genres in order, preserving total level count.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Complete Book Finish Flow with V3 Rewards

The book detail page handles completion but doesn't process V3 rewards (completion bonus levels, XP, loot boxes). Need to call `processSessionEnd` with `isCompletion=true`.

**Files:**
- Modify: `app/book/[id].tsx:131-185`
- Create: `__tests__/app/book/bookCompletion.test.ts`

**Step 1: Write the failing test**

Create `__tests__/app/book/bookCompletion.test.ts`:

```typescript
import { processSessionEnd } from '@/lib/sessionRewards';
import { Book, UserProgress, Companion } from '@/lib/types';
import { Genre, GENRES } from '@/lib/genres';

// Reuse helpers from sessionRewards.test.ts
function createMockBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-1',
    title: 'Test Book',
    coverUrl: null,
    synopsis: null,
    sourceUrl: null,
    status: 'reading',
    totalReadingTime: 14400, // 4 hours
    createdAt: Date.now(),
    normalizedGenres: ['fantasy'] as Genre[],
    progression: {
      level: 4,
      totalSeconds: 14400,
      levelUps: [],
    },
    pageCount: 300, // 10 level floor
    ...overrides,
  };
}

function createMockProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  const genreLevels: Record<Genre, number> = {} as Record<Genre, number>;
  for (const genre of GENRES) {
    genreLevels[genre] = 0;
  }

  return {
    totalXp: 1000,
    level: 2,
    currentStreak: 5,
    longestStreak: 10,
    lastReadDate: null,
    lootItems: [],
    lootBoxes: { availableBoxes: [], openHistory: [] },
    booksFinished: 2,
    booksAdded: 5,
    totalHoursRead: 10,
    genreLevels,
    loadout: { slots: [null, null, null], unlockedSlots: 1 },
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

describe('book completion V3 rewards', () => {
  it('should award completion bonus levels based on page count', () => {
    const mockBook = createMockBook({
      pageCount: 300, // 10 level floor
      progression: {
        level: 4,
        totalSeconds: 14400, // 4 hours = 4 levels
        levelUps: [],
      },
    });
    const mockProgress = createMockProgress();

    // Completing with isCompletion=true, 0 additional seconds
    const result = processSessionEnd(mockBook, mockProgress, [], 0, true);

    // Should get 6 bonus levels (10 floor - 4 current)
    expect(result.bookLevelsGained).toBe(6);
    expect(result.newBookLevel).toBe(10);
  });

  it('should award loot boxes for completion bonus levels', () => {
    const mockBook = createMockBook({
      pageCount: 150, // 5 level floor
      progression: {
        level: 2,
        totalSeconds: 7200,
        levelUps: [],
      },
    });
    const mockProgress = createMockProgress();

    const result = processSessionEnd(mockBook, mockProgress, [], 0, true);

    // 3 bonus levels = 3 loot boxes with 'completion' source
    const completionBoxes = result.lootBoxes.filter(b => b.source === 'completion');
    expect(completionBoxes.length).toBe(3);
  });

  it('should apply streak multiplier to completion XP', () => {
    const mockBook = createMockBook();
    const mockProgress = createMockProgress({ currentStreak: 7 }); // 1.5x

    // 30 minutes of final reading
    const result = processSessionEnd(mockBook, mockProgress, [], 1800, true);

    // 30 min = 300 base XP * 1.5 streak = 450 XP
    expect(result.xpGained).toBe(450);
  });
});
```

**Step 2: Run test to verify behavior**

Run: `npm test -- --testPathPattern=bookCompletion.test.ts`
Expected: PASS (sessionRewards already handles isCompletion)

**Step 3: Update book/[id].tsx to process V3 rewards on completion**

In `app/book/[id].tsx`, modify the `updateStatus` function:

```typescript
async function updateStatus(status: BookStatus) {
  if (!book) return;

  const updatedBook = { ...book, status };

  if (status === 'finished') {
    updatedBook.finishedAt = Date.now();

    // Load progress and equipped companions for V3 rewards
    const progress = await storage.getProgress();
    const loadout = progress.loadout || { slots: [null, null, null], unlockedSlots: 1 };

    // Get equipped companions
    const books = await storage.getBooks();
    const allCompanions: Companion[] = [];
    for (const b of books) {
      if (b.companions?.unlockedCompanions) {
        allCompanions.push(...b.companions.unlockedCompanions);
      }
    }
    const equippedIds = loadout.slots.filter((id): id is string => id !== null);
    const equippedCompanions = equippedIds
      .map(id => allCompanions.find(c => c.id === id))
      .filter((c): c is Companion => c !== undefined);

    // Process V3 completion rewards (0 additional seconds, isCompletion=true)
    const sessionResult = processSessionEnd(
      book,
      progress,
      equippedCompanions,
      0,
      true // isCompletion
    );

    // Use updated book from session processor (has new progression)
    Object.assign(updatedBook, sessionResult.updatedBook);

    // Merge V3 progress updates
    let updatedProgress = sessionResult.updatedProgress;

    // Handle legendary unlock for book completion (existing logic)
    if (book.companions) {
      const legendaryIndex = book.companions.poolQueue.companions.findIndex(
        c => c.rarity === 'legendary' && !c.unlockedAt
      );

      if (legendaryIndex !== -1) {
        const legendary: Companion = {
          ...book.companions.poolQueue.companions[legendaryIndex],
          unlockMethod: 'book_completion',
          unlockedAt: Date.now(),
        };

        updatedBook.companions = {
          ...book.companions,
          poolQueue: {
            ...book.companions.poolQueue,
            companions: book.companions.poolQueue.companions.map((c, i) =>
              i === legendaryIndex ? legendary : c
            ),
          },
          unlockedCompanions: [...book.companions.unlockedCompanions, legendary],
        };

        setCompletionLegendary(legendary);
      }
    }

    // Update booksFinished and check legacy loot box rewards
    const previousProgress = { ...progress };
    updatedProgress.booksFinished = (updatedProgress.booksFinished || 0) + 1;

    const newBoxes = checkLootBoxRewards(previousProgress, updatedProgress);
    if (newBoxes.length > 0) {
      updatedProgress.lootBoxes.availableBoxes.push(...newBoxes);
    }

    await storage.saveProgress(updatedProgress);

    // Show completion notification with V3 rewards
    if (sessionResult.bookLevelsGained > 0 || sessionResult.lootBoxes.length > 0) {
      const notifications: string[] = [];

      if (sessionResult.bookLevelsGained > 0) {
        notifications.push(`+${sessionResult.bookLevelsGained} completion bonus levels!`);
      }
      if (sessionResult.xpGained > 0) {
        notifications.push(`+${sessionResult.xpGained} XP`);
      }
      if (sessionResult.lootBoxes.length > 0) {
        notifications.push(`${sessionResult.lootBoxes.length} loot box${sessionResult.lootBoxes.length > 1 ? 'es' : ''}`);
      }

      Alert.alert(
        'Book Complete!',
        notifications.join('\n'),
        [{ text: 'OK' }]
      );
    }
  }

  await storage.saveBook(updatedBook);
  setBook(updatedBook);
}
```

**Step 4: Add imports to book/[id].tsx**

Add at top of file:

```typescript
import { processSessionEnd } from '@/lib/sessionRewards';
import type { Companion } from '@/lib/types';
```

**Step 5: Run tests**

Run: `npm test`
Expected: PASS

**Step 6: Commit**

```bash
git add app/book/[id].tsx __tests__/app/book/bookCompletion.test.ts
git commit -m "$(cat <<'EOF'
feat(rewards): integrate V3 rewards into book completion flow

When marking a book as finished, now process V3 session rewards
with isCompletion=true to award:
- Completion bonus levels (page-based floor)
- XP with streak multiplier
- Loot boxes for each bonus level

Shows completion notification with rewards summary.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

| Task | Issue | Solution |
|------|-------|----------|
| 1 | Missing streak multiplier in V3 | Import and apply `getStreakMultiplier` in sessionRewards |
| 2 | Consumable duration per-session | Change to minutes-based, pass session duration |
| 3 | Genre level inflation | Distribute levels evenly across genres |
| 4 | Incomplete book finish flow | Call `processSessionEnd(isCompletion=true)` in updateStatus |

All tasks are independent and can be implemented in any order. Each task follows TDD: write failing test, implement fix, verify pass, commit.
