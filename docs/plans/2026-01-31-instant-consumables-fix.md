# Instant Consumables Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 5 instant consumables (`duration: 0`) so they actually work instead of disappearing when claimed.

**Architecture:** Add new fields to `UserProgress` for storing instant effects, update the loot box claiming flow to handle instant consumables separately, and integrate each effect into its corresponding system (streak protection, box opening, session start).

**Tech Stack:** TypeScript, React Native, AsyncStorage

---

## Background

Currently, 5 consumables have `duration: 0` (instant effects) but are completely non-functional:

| Consumable | Effect | Issue |
|------------|--------|-------|
| Calendar Page (`weak_streak_1`) | 1-day streak shield | Not stored, streak logic ignores shields |
| Calendar (`med_streak_1`) | 3-day streak shield | Not stored, streak logic ignores shields |
| Polish Kit (`med_upgrade_1`) | Upgrade next box tier | Not stored, not checked when opening boxes |
| Companion Summon (`strong_companion_1`) | Force companion on next box | Not stored, not checked when opening boxes |
| Time Warp (`strong_level_1`) | Instant level up on current book | Not stored, no implementation exists |

The root cause: `addActiveConsumable()` skips `duration === 0` consumables.

---

## Task 1: Add UserProgress Fields for Instant Consumables

**Files:**
- Modify: `lib/types.ts:150-169`
- Modify: `lib/storage.ts:19-63`

**Step 1: Add new fields to UserProgress interface**

In `lib/types.ts`, add these fields to the `UserProgress` interface (after line 168):

```typescript
  // Instant consumable storage
  streakShieldExpiry?: number | null;   // Timestamp when shield expires, null = no shield
  pendingBoxUpgrade?: boolean;          // Upgrade next box tier
  pendingGuaranteedCompanion?: boolean; // Force companion on next box
  pendingInstantLevels?: number;        // Count of instant level-ups available
```

**Step 2: Add default values to storage.ts**

In `lib/storage.ts`, add defaults to `defaultProgress` (around line 62, before the closing brace):

```typescript
  streakShieldExpiry: null,
  pendingBoxUpgrade: false,
  pendingGuaranteedCompanion: false,
  pendingInstantLevels: 0,
```

**Step 3: Commit**

```bash
git add lib/types.ts lib/storage.ts
git commit -m "$(cat <<'EOF'
feat(consumables): add UserProgress fields for instant consumables

Add storage fields for streak shields, box upgrades, guaranteed companions,
and instant level-ups. These are needed to persist instant consumable effects.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create Instant Consumable Handler

**Files:**
- Create: `lib/instantConsumables.ts`
- Create: `__tests__/lib/instantConsumables.test.ts`

**Step 1: Write the failing tests**

Create `__tests__/lib/instantConsumables.test.ts`:

```typescript
import { UserProgress } from '@/lib/types';
import { ConsumableDefinition } from '@/lib/consumables';
import {
  applyInstantConsumable,
  STREAK_SHIELD_HOURS,
} from '@/lib/instantConsumables';

// Helper to create minimal UserProgress
function createProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
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
    streakShieldExpiry: null,
    pendingBoxUpgrade: false,
    pendingGuaranteedCompanion: false,
    pendingInstantLevels: 0,
    ...overrides,
  };
}

describe('applyInstantConsumable', () => {
  describe('streak_shield', () => {
    it('should set streakShieldExpiry for 1-day shield', () => {
      const consumable: ConsumableDefinition = {
        id: 'weak_streak_1',
        name: 'Calendar Page',
        description: '1-day streak shield',
        tier: 'weak',
        effectType: 'streak_shield',
        magnitude: 1,
        duration: 0,
      };
      const progress = createProgress();
      const now = Date.now();

      const result = applyInstantConsumable(progress, consumable, now);

      // 1 day = 24 hours
      expect(result.streakShieldExpiry).toBe(now + STREAK_SHIELD_HOURS.weak * 60 * 60 * 1000);
    });

    it('should set streakShieldExpiry for 3-day shield', () => {
      const consumable: ConsumableDefinition = {
        id: 'med_streak_1',
        name: 'Calendar',
        description: '3-day streak shield',
        tier: 'medium',
        effectType: 'streak_shield',
        magnitude: 3,
        duration: 0,
      };
      const progress = createProgress();
      const now = Date.now();

      const result = applyInstantConsumable(progress, consumable, now);

      // 3 days = 72 hours
      expect(result.streakShieldExpiry).toBe(now + STREAK_SHIELD_HOURS.medium * 60 * 60 * 1000);
    });

    it('should extend existing shield', () => {
      const consumable: ConsumableDefinition = {
        id: 'weak_streak_1',
        name: 'Calendar Page',
        description: '1-day streak shield',
        tier: 'weak',
        effectType: 'streak_shield',
        magnitude: 1,
        duration: 0,
      };
      const now = Date.now();
      const existingExpiry = now + 12 * 60 * 60 * 1000; // 12 hours remaining
      const progress = createProgress({ streakShieldExpiry: existingExpiry });

      const result = applyInstantConsumable(progress, consumable, now);

      // Should add 24 hours to existing expiry
      expect(result.streakShieldExpiry).toBe(existingExpiry + STREAK_SHIELD_HOURS.weak * 60 * 60 * 1000);
    });
  });

  describe('box_upgrade', () => {
    it('should set pendingBoxUpgrade to true', () => {
      const consumable: ConsumableDefinition = {
        id: 'med_upgrade_1',
        name: 'Polish Kit',
        description: 'Upgrade next box tier',
        tier: 'medium',
        effectType: 'box_upgrade',
        magnitude: 1,
        duration: 0,
      };
      const progress = createProgress();

      const result = applyInstantConsumable(progress, consumable);

      expect(result.pendingBoxUpgrade).toBe(true);
    });
  });

  describe('guaranteed_companion', () => {
    it('should set pendingGuaranteedCompanion to true', () => {
      const consumable: ConsumableDefinition = {
        id: 'strong_companion_1',
        name: 'Companion Summon',
        description: 'Guaranteed companion on next box',
        tier: 'strong',
        effectType: 'guaranteed_companion',
        magnitude: 1,
        duration: 0,
      };
      const progress = createProgress();

      const result = applyInstantConsumable(progress, consumable);

      expect(result.pendingGuaranteedCompanion).toBe(true);
    });
  });

  describe('instant_level', () => {
    it('should increment pendingInstantLevels', () => {
      const consumable: ConsumableDefinition = {
        id: 'strong_level_1',
        name: 'Time Warp',
        description: 'Instant level up on current book',
        tier: 'strong',
        effectType: 'instant_level',
        magnitude: 1,
        duration: 0,
      };
      const progress = createProgress();

      const result = applyInstantConsumable(progress, consumable);

      expect(result.pendingInstantLevels).toBe(1);
    });

    it('should stack multiple instant levels', () => {
      const consumable: ConsumableDefinition = {
        id: 'strong_level_1',
        name: 'Time Warp',
        description: 'Instant level up on current book',
        tier: 'strong',
        effectType: 'instant_level',
        magnitude: 1,
        duration: 0,
      };
      const progress = createProgress({ pendingInstantLevels: 2 });

      const result = applyInstantConsumable(progress, consumable);

      expect(result.pendingInstantLevels).toBe(3);
    });
  });

  describe('non-instant consumables', () => {
    it('should return progress unchanged for duration > 0 consumables', () => {
      const consumable: ConsumableDefinition = {
        id: 'weak_xp_1',
        name: 'Minor XP Scroll',
        description: '+10% XP for 60 min',
        tier: 'weak',
        effectType: 'xp_boost',
        magnitude: 0.10,
        duration: 60,
      };
      const progress = createProgress();

      const result = applyInstantConsumable(progress, consumable);

      expect(result).toEqual(progress);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/instantConsumables.test.ts`
Expected: FAIL with "Cannot find module '@/lib/instantConsumables'"

**Step 3: Write the implementation**

Create `lib/instantConsumables.ts`:

```typescript
import { UserProgress } from './types';
import { ConsumableDefinition, ConsumableTier } from './consumables';

/**
 * Hours of streak protection by consumable tier.
 * weak (Calendar Page) = 24 hours (1 day)
 * medium (Calendar) = 72 hours (3 days)
 */
export const STREAK_SHIELD_HOURS: Record<ConsumableTier, number> = {
  weak: 24,
  medium: 72,
  strong: 72, // Not currently used, but defined for completeness
};

/**
 * Apply an instant consumable effect to progress.
 * Returns updated progress with the effect applied.
 *
 * For non-instant consumables (duration > 0), returns progress unchanged.
 * Those should use addActiveConsumable() instead.
 */
export function applyInstantConsumable(
  progress: UserProgress,
  consumable: ConsumableDefinition,
  now: number = Date.now()
): UserProgress {
  // Only handle instant consumables
  if (consumable.duration !== 0) {
    return progress;
  }

  switch (consumable.effectType) {
    case 'streak_shield': {
      const hoursToAdd = STREAK_SHIELD_HOURS[consumable.tier];
      const msToAdd = hoursToAdd * 60 * 60 * 1000;

      // If shield already exists and hasn't expired, extend it
      const currentExpiry = progress.streakShieldExpiry;
      const baseTime = currentExpiry && currentExpiry > now ? currentExpiry : now;

      return {
        ...progress,
        streakShieldExpiry: baseTime + msToAdd,
      };
    }

    case 'box_upgrade':
      return {
        ...progress,
        pendingBoxUpgrade: true,
      };

    case 'guaranteed_companion':
      return {
        ...progress,
        pendingGuaranteedCompanion: true,
      };

    case 'instant_level':
      return {
        ...progress,
        pendingInstantLevels: (progress.pendingInstantLevels || 0) + 1,
      };

    default:
      return progress;
  }
}

/**
 * Check if an instant consumable effect is available.
 */
export function hasStreakShield(progress: UserProgress, now: number = Date.now()): boolean {
  return progress.streakShieldExpiry != null && progress.streakShieldExpiry > now;
}

/**
 * Get remaining streak shield hours.
 */
export function getStreakShieldHoursRemaining(progress: UserProgress, now: number = Date.now()): number {
  if (!hasStreakShield(progress, now)) return 0;
  return Math.ceil((progress.streakShieldExpiry! - now) / (60 * 60 * 1000));
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/instantConsumables.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/instantConsumables.ts __tests__/lib/instantConsumables.test.ts
git commit -m "$(cat <<'EOF'
feat(consumables): add instant consumable handler

Implements applyInstantConsumable() to properly store instant effects:
- streak_shield: Sets expiry timestamp (24h weak, 72h medium)
- box_upgrade: Sets pendingBoxUpgrade flag
- guaranteed_companion: Sets pendingGuaranteedCompanion flag
- instant_level: Increments pendingInstantLevels counter

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Update Loot Box Claiming to Use Instant Handler

**Files:**
- Modify: `app/loot-box.tsx:101-111`

**Step 1: Update consumable handling in handleOpenBox**

In `app/loot-box.tsx`, add import at top (after line 12):

```typescript
import { applyInstantConsumable } from '@/lib/instantConsumables';
```

Then replace lines 101-111 (the consumable handling block):

```typescript
      if (lootResult.category === 'consumable' && lootResult.consumable) {
        // Handle consumable drop
        if (lootResult.consumable.duration === 0) {
          // Instant consumable - apply directly
          const withInstant = applyInstantConsumable(updatedProgress, lootResult.consumable);
          updatedProgress = { ...updatedProgress, ...withInstant };
        } else {
          // Duration-based consumable - add to active list
          updatedProgress.activeConsumables = addActiveConsumable(
            updatedProgress.activeConsumables || [],
            lootResult.consumable
          );
        }
        await storage.saveProgress(updatedProgress);

        setRevealedConsumable(lootResult.consumable);
        setRevealedTier(rolledTier);
        setRevealedCompanion(null);
      }
```

**Step 2: Verify the app still builds**

Run: `npm run build` or `npx expo start` and test opening a loot box

**Step 3: Commit**

```bash
git add app/loot-box.tsx
git commit -m "$(cat <<'EOF'
feat(loot-box): handle instant consumables when claiming

Instant consumables (duration=0) are now properly stored using
applyInstantConsumable() instead of being silently discarded.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Integrate Streak Shield with Streak Logic

**Files:**
- Modify: `lib/streak.ts`
- Modify: `__tests__/lib/streak.test.ts`

**Step 1: Write failing tests for streak shield integration**

Add to `__tests__/lib/streak.test.ts`:

```typescript
import { updateStreakWithShield } from '@/lib/streak';

describe('updateStreakWithShield', () => {
  it('should protect streak when shield is active and day was skipped', () => {
    const now = Date.now();
    const shieldExpiry = now + 24 * 60 * 60 * 1000; // Shield valid for 24 more hours

    const result = updateStreakWithShield(
      '2026-01-25', // Last read 2 days ago
      '2026-01-27', // Today
      5,            // Current streak
      5,            // Longest streak
      shieldExpiry,
      now
    );

    expect(result.currentStreak).toBe(5); // Streak preserved
    expect(result.shieldConsumed).toBe(true);
    expect(result.newShieldExpiry).toBeNull(); // Shield consumed
  });

  it('should not consume shield for consecutive days', () => {
    const now = Date.now();
    const shieldExpiry = now + 24 * 60 * 60 * 1000;

    const result = updateStreakWithShield(
      '2026-01-26', // Yesterday
      '2026-01-27', // Today
      5,
      5,
      shieldExpiry,
      now
    );

    expect(result.currentStreak).toBe(6); // Normal increment
    expect(result.shieldConsumed).toBe(false);
    expect(result.newShieldExpiry).toBe(shieldExpiry); // Shield preserved
  });

  it('should reset streak when shield is expired', () => {
    const now = Date.now();
    const shieldExpiry = now - 1000; // Shield expired

    const result = updateStreakWithShield(
      '2026-01-25', // 2 days ago
      '2026-01-27',
      5,
      5,
      shieldExpiry,
      now
    );

    expect(result.currentStreak).toBe(1); // Streak reset
    expect(result.shieldConsumed).toBe(false);
  });

  it('should reset streak when no shield exists', () => {
    const now = Date.now();

    const result = updateStreakWithShield(
      '2026-01-25',
      '2026-01-27',
      5,
      5,
      null, // No shield
      now
    );

    expect(result.currentStreak).toBe(1);
    expect(result.shieldConsumed).toBe(false);
  });

  it('should maintain streak for same day', () => {
    const now = Date.now();
    const shieldExpiry = now + 24 * 60 * 60 * 1000;

    const result = updateStreakWithShield(
      '2026-01-27',
      '2026-01-27',
      5,
      5,
      shieldExpiry,
      now
    );

    expect(result.currentStreak).toBe(5);
    expect(result.shieldConsumed).toBe(false);
    expect(result.newShieldExpiry).toBe(shieldExpiry);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/streak.test.ts`
Expected: FAIL with "updateStreakWithShield is not a function"

**Step 3: Implement updateStreakWithShield**

Add to `lib/streak.ts`:

```typescript
export interface StreakUpdateResult {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string;
  shieldConsumed: boolean;
  newShieldExpiry: number | null;
}

/**
 * Update streak with shield protection.
 * If a day was skipped but shield is active, preserve the streak and consume the shield.
 */
export function updateStreakWithShield(
  lastReadDate: string | null,
  today: string,
  currentStreak: number,
  longestStreak: number = 0,
  shieldExpiry: number | null,
  now: number = Date.now()
): StreakUpdateResult {
  // No previous read - start fresh
  if (!lastReadDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, longestStreak),
      lastReadDate: today,
      shieldConsumed: false,
      newShieldExpiry: shieldExpiry,
    };
  }

  // Same day - no change
  if (lastReadDate === today) {
    return {
      currentStreak,
      longestStreak,
      lastReadDate: today,
      shieldConsumed: false,
      newShieldExpiry: shieldExpiry,
    };
  }

  const last = new Date(lastReadDate);
  const current = new Date(today);
  const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  // Consecutive day - increment normally
  if (diffDays === 1) {
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, longestStreak),
      lastReadDate: today,
      shieldConsumed: false,
      newShieldExpiry: shieldExpiry,
    };
  }

  // Day(s) skipped - check shield
  const hasActiveShield = shieldExpiry != null && shieldExpiry > now;

  if (hasActiveShield) {
    // Shield protects the streak, consume it
    return {
      currentStreak,
      longestStreak,
      lastReadDate: today,
      shieldConsumed: true,
      newShieldExpiry: null, // Shield consumed
    };
  }

  // No shield - reset streak
  return {
    currentStreak: 1,
    longestStreak: Math.max(1, longestStreak),
    lastReadDate: today,
    shieldConsumed: false,
    newShieldExpiry: shieldExpiry,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/streak.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/streak.ts __tests__/lib/streak.test.ts
git commit -m "$(cat <<'EOF'
feat(streak): add shield protection to streak logic

Implements updateStreakWithShield() which preserves streak when days are
skipped but an active shield exists. Shield is consumed on use.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Update Timer to Use Shield-Aware Streak Update

**Files:**
- Modify: `app/timer/[bookId].tsx:133-147`

**Step 1: Update streak handling in handleEnd**

Replace the streak update code (lines 133-147) with:

```typescript
    // Update streak (with shield protection)
    const today = getDateString();
    const { updateStreakWithShield } = await import('@/lib/streak');
    const streakResult = updateStreakWithShield(
      progress.lastReadDate,
      today,
      progress.currentStreak,
      progress.longestStreak,
      progress.streakShieldExpiry ?? null,
      Date.now()
    );
    progress.currentStreak = streakResult.currentStreak;
    progress.longestStreak = streakResult.longestStreak;
    progress.lastReadDate = streakResult.lastReadDate;
    progress.streakShieldExpiry = streakResult.newShieldExpiry;

    if (streakResult.shieldConsumed) {
      debug.log('timer', 'Streak shield consumed!');
    }
    debug.log('timer', 'Streak updated', {
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      shieldConsumed: streakResult.shieldConsumed,
    });
```

Also update the import at top of file (line 8) to include `updateStreakWithShield`:

```typescript
import { getDateString } from '@/lib/streak';
```

(Remove `updateStreak` from the import since we're using dynamic import for updateStreakWithShield to avoid circular dependencies, or alternatively add it to the static import)

**Step 2: Verify the app builds and runs**

Run: `npx expo start` and test ending a session

**Step 3: Commit**

```bash
git add app/timer/[bookId].tsx
git commit -m "$(cat <<'EOF'
feat(timer): use shield-aware streak update

Timer now uses updateStreakWithShield() to protect streak when shield
is active. Shield consumption is logged for debugging.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Integrate Box Upgrade and Guaranteed Companion

**Files:**
- Modify: `lib/lootBoxV3.ts`
- Modify: `__tests__/lib/lootBoxV3.test.ts`

**Step 1: Write failing tests**

Add to `__tests__/lib/lootBoxV3.test.ts`:

```typescript
describe('openLootBoxV3 with pending effects', () => {
  it('should upgrade box tier when pendingBoxUpgrade is true', () => {
    const box: LootBoxV3 = {
      id: 'test-box',
      tier: 'wood', // Would normally be wood
      earnedAt: Date.now(),
      source: 'level_up',
    };
    const progress: UserProgress = {
      ...createMinimalProgress(),
      pendingBoxUpgrade: true,
    };

    const result = openLootBoxV3(box, progress, [], []);

    expect(result.rolledTier).toBe('silver'); // Upgraded from wood
    expect(result.updatedProgress.pendingBoxUpgrade).toBe(false); // Consumed
  });

  it('should upgrade silver to gold when pendingBoxUpgrade is true', () => {
    const box: LootBoxV3 = {
      id: 'test-box',
      tier: 'silver',
      earnedAt: Date.now(),
      source: 'level_up',
    };
    const progress: UserProgress = {
      ...createMinimalProgress(),
      pendingBoxUpgrade: true,
    };

    const result = openLootBoxV3(box, progress, [], []);

    expect(result.rolledTier).toBe('gold');
    expect(result.updatedProgress.pendingBoxUpgrade).toBe(false);
  });

  it('should keep gold as gold when pendingBoxUpgrade is true', () => {
    const box: LootBoxV3 = {
      id: 'test-box',
      tier: 'gold',
      earnedAt: Date.now(),
      source: 'level_up',
    };
    const progress: UserProgress = {
      ...createMinimalProgress(),
      pendingBoxUpgrade: true,
    };

    const result = openLootBoxV3(box, progress, [], []);

    expect(result.rolledTier).toBe('gold');
    expect(result.updatedProgress.pendingBoxUpgrade).toBe(false); // Still consumed
  });

  it('should force companion when pendingGuaranteedCompanion is true', () => {
    const box: LootBoxV3 = {
      id: 'test-box',
      tier: 'wood',
      earnedAt: Date.now(),
      source: 'level_up',
    };
    const progress: UserProgress = {
      ...createMinimalProgress(),
      pendingGuaranteedCompanion: true,
    };

    // Mock Math.random to normally give consumable
    const originalRandom = Math.random;
    Math.random = () => 0.01; // Would normally be consumable for wood

    const result = openLootBoxV3(box, progress, [], [], { companionPoolSize: 5 });

    Math.random = originalRandom;

    expect(result.lootResult.category).toBe('companion');
    expect(result.updatedProgress.pendingGuaranteedCompanion).toBe(false);
  });

  it('should give consumable fallback when pool empty even with guaranteed companion', () => {
    const box: LootBoxV3 = {
      id: 'test-box',
      tier: 'wood',
      earnedAt: Date.now(),
      source: 'level_up',
    };
    const progress: UserProgress = {
      ...createMinimalProgress(),
      pendingGuaranteedCompanion: true,
    };

    const result = openLootBoxV3(box, progress, [], [], { companionPoolSize: 0 });

    expect(result.lootResult.category).toBe('consumable');
    // Guaranteed companion NOT consumed since pool was empty
    expect(result.updatedProgress.pendingGuaranteedCompanion).toBe(true);
  });
});

function createMinimalProgress(): UserProgress {
  return {
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
    goldPityCounter: 0,
    pendingBoxUpgrade: false,
    pendingGuaranteedCompanion: false,
  };
}
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/lootBoxV3.test.ts`
Expected: FAIL

**Step 3: Update openLootBoxV3 implementation**

Update `lib/lootBoxV3.ts`:

```typescript
import { LootBoxV3, LootBoxTier, UserProgress, Companion } from './types';
import { Genre } from './genres';
import { calculateActiveEffects } from './companionEffects';
import { getActiveEffects as getConsumableEffects } from './consumableManager';
import { rollBoxTierWithPity, rollLootForTier, LootResult, rollCategory, rollConsumable, rollCompanionRarity } from './lootV3';

export interface OpenLootBoxResult {
  rolledTier: LootBoxTier;
  lootResult: LootResult;
  updatedProgress: UserProgress;
}

export interface OpenLootBoxOptions {
  /** Number of companions available in the pool (0 = force consumable) */
  companionPoolSize?: number;
}

/**
 * Upgrade a box tier by one level.
 */
function upgradeTier(tier: LootBoxTier): LootBoxTier {
  switch (tier) {
    case 'wood': return 'silver';
    case 'silver': return 'gold';
    case 'gold': return 'gold';
  }
}

/**
 * Open a V3 loot box, rolling tier at open time if blank.
 * Applies luck stats, pity system, and pending instant effects.
 *
 * @param options.companionPoolSize - Pass 0 to force consumable drops when pool is empty
 */
export function openLootBoxV3(
  box: LootBoxV3,
  progress: UserProgress,
  equippedCompanions: Companion[],
  bookGenres: Genre[],
  options?: OpenLootBoxOptions
): OpenLootBoxResult {
  const companionPoolAvailable = (options?.companionPoolSize ?? 1) > 0;
  let rolledTier: LootBoxTier;
  let newPityCounter: number;

  // Check if this is a legacy box with pre-determined tier
  if (box.tier !== undefined) {
    // Legacy box: use existing tier
    rolledTier = box.tier;

    // Still update pity based on result for consistency
    if (rolledTier === 'gold') {
      newPityCounter = 0;
    } else {
      newPityCounter = (progress.goldPityCounter ?? 0) + 1;
    }
  } else {
    // Blank box: roll tier at open time
    const companionEffects = calculateActiveEffects(equippedCompanions, bookGenres);
    const consumableEffects = getConsumableEffects(progress.activeConsumables ?? []);

    const totalLuck = companionEffects.luck + consumableEffects.luck;
    const totalRareLuck = companionEffects.rareLuck + consumableEffects.rareLuck;
    const totalLegendaryLuck = companionEffects.legendaryLuck + consumableEffects.legendaryLuck;

    const tierResult = rollBoxTierWithPity(
      totalLuck,
      totalRareLuck,
      totalLegendaryLuck,
      { goldPityCounter: progress.goldPityCounter ?? 0 }
    );

    rolledTier = tierResult.tier;
    newPityCounter = tierResult.newPityCounter;
  }

  // Apply box upgrade if pending
  let consumedBoxUpgrade = false;
  if (progress.pendingBoxUpgrade) {
    rolledTier = upgradeTier(rolledTier);
    consumedBoxUpgrade = true;
  }

  // Roll loot contents
  let lootResult: LootResult;
  let consumedGuaranteedCompanion = false;

  if (progress.pendingGuaranteedCompanion && companionPoolAvailable) {
    // Force companion drop
    const companionRarity = rollCompanionRarity(rolledTier);
    lootResult = {
      boxTier: rolledTier,
      category: 'companion',
      companionRarity,
    };
    consumedGuaranteedCompanion = true;
  } else {
    // Normal roll (force consumable if pool empty)
    lootResult = rollLootForTier(rolledTier, { companionPoolAvailable });
  }

  // Create updated progress with new pity counter and consumed effects
  const updatedProgress: UserProgress = {
    ...progress,
    goldPityCounter: newPityCounter,
    pendingBoxUpgrade: consumedBoxUpgrade ? false : progress.pendingBoxUpgrade,
    pendingGuaranteedCompanion: consumedGuaranteedCompanion ? false : progress.pendingGuaranteedCompanion,
  };

  return {
    rolledTier,
    lootResult,
    updatedProgress,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/lootBoxV3.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/lootBoxV3.ts __tests__/lib/lootBoxV3.test.ts
git commit -m "$(cat <<'EOF'
feat(lootBox): integrate box upgrade and guaranteed companion effects

openLootBoxV3 now checks for pending instant effects:
- pendingBoxUpgrade: Upgrades tier (wood→silver→gold)
- pendingGuaranteedCompanion: Forces companion drop if pool available

Effects are consumed on use and flags reset in updatedProgress.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Implement Instant Level on Session Start

**Files:**
- Modify: `app/timer/[bookId].tsx`
- Modify: `lib/sessionRewards.ts`

**Step 1: Add instant level application to timer loadBookAndCompanions**

In `app/timer/[bookId].tsx`, update the `loadBookAndCompanions` function to check for and apply pending instant levels. Add after loading the book (around line 51):

```typescript
    // Check for pending instant levels
    if (foundBook && progress.pendingInstantLevels && progress.pendingInstantLevels > 0) {
      debug.log('timer', `Applying ${progress.pendingInstantLevels} instant level(s) to book`);

      // Apply instant levels to book
      const currentLevel = foundBook.progression?.level || 1;
      const newLevel = currentLevel + progress.pendingInstantLevels;

      foundBook = {
        ...foundBook,
        progression: {
          ...foundBook.progression,
          level: newLevel,
          totalSeconds: foundBook.progression?.totalSeconds || foundBook.totalReadingTime,
          levelUps: [...(foundBook.progression?.levelUps || []), Date.now()],
        },
      };

      // Clear the pending instant levels
      progress.pendingInstantLevels = 0;

      // Save both
      await storage.saveBook(foundBook);
      await storage.saveProgress(progress);

      debug.log('timer', `Book leveled up to ${newLevel}`);
    }
```

**Step 2: Verify the app builds**

Run: `npx expo start`

**Step 3: Commit**

```bash
git add app/timer/[bookId].tsx
git commit -m "$(cat <<'EOF'
feat(timer): apply instant levels when starting session

When user starts a reading session, any pending instant levels are
applied to the current book. This allows users to choose which book
gets the level-up by starting a session with it.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Update Profile to Show Pending Instant Consumables

**Files:**
- Modify: `app/(tabs)/profile.tsx`

**Step 1: Add pending consumables display section**

In `app/(tabs)/profile.tsx`, add a section after "Active Effects" (around line 180) to show pending instant consumables:

```typescript
      {/* Pending Instant Effects section */}
      {(progress?.streakShieldExpiry || progress?.pendingBoxUpgrade ||
        progress?.pendingGuaranteedCompanion || (progress?.pendingInstantLevels ?? 0) > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>pending effects_</Text>
          <View style={styles.consumablesList}>
            {progress.streakShieldExpiry && progress.streakShieldExpiry > Date.now() && (
              <DungeonCard variant="default" style={styles.consumableItem}>
                <View style={styles.consumableRow}>
                  <ConsumableIcon effectType="streak_shield" tier="weak" />
                  <View style={styles.consumableInfo}>
                    <Text style={styles.consumableName}>streak shield</Text>
                    <Text style={styles.consumableDesc}>
                      {Math.ceil((progress.streakShieldExpiry - Date.now()) / (60 * 60 * 1000))}h protection remaining
                    </Text>
                  </View>
                </View>
              </DungeonCard>
            )}
            {progress.pendingBoxUpgrade && (
              <DungeonCard variant="default" style={styles.consumableItem}>
                <View style={styles.consumableRow}>
                  <ConsumableIcon effectType="box_upgrade" tier="medium" />
                  <View style={styles.consumableInfo}>
                    <Text style={styles.consumableName}>polish kit</Text>
                    <Text style={styles.consumableDesc}>next box tier upgraded</Text>
                  </View>
                </View>
              </DungeonCard>
            )}
            {progress.pendingGuaranteedCompanion && (
              <DungeonCard variant="default" style={styles.consumableItem}>
                <View style={styles.consumableRow}>
                  <ConsumableIcon effectType="guaranteed_companion" tier="strong" />
                  <View style={styles.consumableInfo}>
                    <Text style={styles.consumableName}>companion summon</Text>
                    <Text style={styles.consumableDesc}>next box guarantees companion</Text>
                  </View>
                </View>
              </DungeonCard>
            )}
            {(progress.pendingInstantLevels ?? 0) > 0 && (
              <DungeonCard variant="default" style={styles.consumableItem}>
                <View style={styles.consumableRow}>
                  <ConsumableIcon effectType="instant_level" tier="strong" />
                  <View style={styles.consumableInfo}>
                    <Text style={styles.consumableName}>time warp x{progress.pendingInstantLevels}</Text>
                    <Text style={styles.consumableDesc}>start a session to level up book</Text>
                  </View>
                </View>
              </DungeonCard>
            )}
          </View>
        </View>
      )}
```

**Step 2: Verify the profile page renders correctly**

Run: `npx expo start` and check the profile page

**Step 3: Commit**

```bash
git add app/(tabs)/profile.tsx
git commit -m "$(cat <<'EOF'
feat(profile): display pending instant consumables

Profile now shows pending instant effects:
- Streak shield with hours remaining
- Box upgrade ready status
- Guaranteed companion ready status
- Instant levels available (with instructions)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Update Consumable Descriptions

**Files:**
- Modify: `lib/consumables.ts`

**Step 1: Update descriptions to be clearer**

Update the instant consumable descriptions in `lib/consumables.ts`:

```typescript
  { id: 'weak_streak_1', name: 'Calendar Page', description: '24h streak protection', tier: 'weak', effectType: 'streak_shield', magnitude: 1, duration: 0 },
  // ...
  { id: 'med_streak_1', name: 'Calendar', description: '72h streak protection', tier: 'medium', effectType: 'streak_shield', magnitude: 3, duration: 0 },
  { id: 'med_upgrade_1', name: 'Polish Kit', description: 'Upgrade next box tier', tier: 'medium', effectType: 'box_upgrade', magnitude: 1, duration: 0 },
  // ...
  { id: 'strong_companion_1', name: 'Companion Summon', description: 'Guarantee companion on next box', tier: 'strong', effectType: 'guaranteed_companion', magnitude: 1, duration: 0 },
  { id: 'strong_level_1', name: 'Time Warp', description: 'Level up book on next session', tier: 'strong', effectType: 'instant_level', magnitude: 1, duration: 0 },
```

**Step 2: Commit**

```bash
git add lib/consumables.ts
git commit -m "$(cat <<'EOF'
docs(consumables): clarify instant consumable descriptions

Update descriptions to explain when each effect activates:
- Streak shields: now show hours (24h/72h)
- Time Warp: clarifies it activates on next session

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Final Integration Test

**Step 1: Manual testing checklist**

Test each instant consumable works:

1. **Streak Shield**
   - [ ] Claim a streak shield from loot box
   - [ ] Check profile shows "pending effects" with shield
   - [ ] Close app, skip a day, reopen and start session
   - [ ] Verify streak is preserved and shield is consumed

2. **Box Upgrade**
   - [ ] Claim a Polish Kit from loot box
   - [ ] Check profile shows pending box upgrade
   - [ ] Open a loot box
   - [ ] Verify the tier was upgraded (wood→silver or silver→gold)

3. **Guaranteed Companion**
   - [ ] Claim a Companion Summon from loot box
   - [ ] Check profile shows pending guaranteed companion
   - [ ] Open a loot box
   - [ ] Verify you got a companion (not a consumable)

4. **Instant Level**
   - [ ] Claim a Time Warp from loot box
   - [ ] Check profile shows pending instant level
   - [ ] Start a reading session on any book
   - [ ] Verify book level increased immediately

**Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Final commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
test: verify instant consumables integration

All 5 instant consumables now work correctly:
- streak_shield: Protects streak for 24/72 hours
- box_upgrade: Upgrades next box tier
- guaranteed_companion: Forces companion on next box
- instant_level: Levels up book on session start

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

This plan fixes all 5 broken instant consumables:

| Consumable | Before | After |
|------------|--------|-------|
| Calendar Page | Vanished | 24h streak protection stored |
| Calendar | Vanished | 72h streak protection stored |
| Polish Kit | Vanished | Upgrades next box tier |
| Companion Summon | Vanished | Forces companion on next box |
| Time Warp | Vanished | Levels up book on session start |

Key changes:
1. New `UserProgress` fields for storing instant effects
2. New `applyInstantConsumable()` handler for claiming
3. Updated `updateStreakWithShield()` for streak protection
4. Updated `openLootBoxV3()` for box upgrade and guaranteed companion
5. Updated timer for instant level application
6. Updated profile to display pending effects
