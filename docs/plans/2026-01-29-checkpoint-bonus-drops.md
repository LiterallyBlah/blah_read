# Checkpoint-Based Bonus Drops Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the exploitable single session-end bonus drop roll with time-based checkpoint rolls during sessions.

**Architecture:** Add a `rollCheckpointDrops()` function to lootV3.ts that calculates drops based on session duration with 10-minute checkpoints. Each checkpoint has a 1% base chance + dropRateBoost. Sessions under 5 minutes get no drops. Partial checkpoints get proportional chance.

**Tech Stack:** TypeScript, Jest

---

## Task 1: Add Checkpoint Constants to lootV3.ts

**Files:**
- Modify: `lib/lootV3.ts:189-191` (after pity constants)

**Step 1: Write the failing test**

Add to `__tests__/lib/lootV3.test.ts` after the pity constant tests:

```typescript
describe('checkpoint drop constants', () => {
  it('should export checkpoint constants', () => {
    expect(BASE_CHECKPOINT_DROP_CHANCE).toBe(0.01);
    expect(CHECKPOINT_INTERVAL_MINUTES).toBe(10);
    expect(MINIMUM_SESSION_MINUTES).toBe(5);
  });
});
```

Also update the import at the top of the test file to include the new constants:

```typescript
import {
  // ... existing imports ...
  BASE_CHECKPOINT_DROP_CHANCE,
  CHECKPOINT_INTERVAL_MINUTES,
  MINIMUM_SESSION_MINUTES,
} from '@/lib/lootV3';
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/lootV3.test.ts -t "checkpoint drop constants"`
Expected: FAIL with "BASE_CHECKPOINT_DROP_CHANCE is not defined"

**Step 3: Write minimal implementation**

Add after line 191 in `lib/lootV3.ts`:

```typescript
// Checkpoint drop constants
export const BASE_CHECKPOINT_DROP_CHANCE = 0.01; // 1% base chance per checkpoint
export const CHECKPOINT_INTERVAL_MINUTES = 10;   // Roll every 10 minutes
export const MINIMUM_SESSION_MINUTES = 5;        // Must read at least 5 min
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/lootV3.test.ts -t "checkpoint drop constants"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/lootV3.ts __tests__/lib/lootV3.test.ts
git commit -m "feat(loot): add checkpoint drop constants"
```

---

## Task 2: Implement rollCheckpointDrops Function

**Files:**
- Modify: `lib/lootV3.ts` (add function after rollBonusDrop)
- Modify: `__tests__/lib/lootV3.test.ts` (add tests)

**Step 1: Write the failing tests**

Add to `__tests__/lib/lootV3.test.ts`:

```typescript
describe('rollCheckpointDrops', () => {
  it('should return 0 for sessions under minimum', () => {
    // 4 minutes is under the 5 minute minimum
    expect(rollCheckpointDrops(4, 0)).toBe(0);
    expect(rollCheckpointDrops(4, 0.5)).toBe(0);
    expect(rollCheckpointDrops(0, 0.5)).toBe(0);
  });

  it('should return 0 for exactly minimum session with no boost', () => {
    // 5 minutes gets a partial checkpoint (5/10 = 0.5 multiplier)
    // With 1% base and 0 boost, very unlikely to get a drop
    let drops = 0;
    for (let i = 0; i < 100; i++) {
      drops += rollCheckpointDrops(5, 0);
    }
    // With 0.5% chance (1% * 0.5), expect ~0-1 drops in 100 trials
    expect(drops).toBeLessThan(5);
  });

  it('should sometimes award drops with high boost', () => {
    // 10 minutes = 1 full checkpoint
    // With 50% boost, total chance is 51%
    let drops = 0;
    for (let i = 0; i < 100; i++) {
      drops += rollCheckpointDrops(10, 0.5);
    }
    // With 51% chance, expect 30-70 drops
    expect(drops).toBeGreaterThan(20);
    expect(drops).toBeLessThan(80);
  });

  it('should calculate correct number of checkpoints', () => {
    // 25 minutes = 2 full checkpoints + partial (5/10)
    // With 100% chance (99% boost + 1% base), should get ~2-3 drops
    let totalDrops = 0;
    for (let i = 0; i < 100; i++) {
      totalDrops += rollCheckpointDrops(25, 0.99);
    }
    // Average should be close to 2.5 * 100 = 250
    expect(totalDrops).toBeGreaterThan(200);
    expect(totalDrops).toBeLessThan(300);
  });

  it('should handle exact checkpoint boundaries', () => {
    // 20 minutes = exactly 2 checkpoints, no partial
    // With 100% chance, should always get exactly 2
    for (let i = 0; i < 10; i++) {
      expect(rollCheckpointDrops(20, 0.99)).toBe(2);
    }
  });

  it('should apply proportional chance to partial checkpoints', () => {
    // 15 minutes = 1 full + 0.5 partial
    // With 100% boost: full gets 1, partial gets ~0.5
    let totalDrops = 0;
    for (let i = 0; i < 100; i++) {
      totalDrops += rollCheckpointDrops(15, 0.99);
    }
    // Average should be 1.5 * 100 = 150 (allow variance)
    expect(totalDrops).toBeGreaterThan(120);
    expect(totalDrops).toBeLessThan(180);
  });

  it('should handle negative boost as 0', () => {
    // Negative boost should be treated as 0, leaving just base chance
    let drops = 0;
    for (let i = 0; i < 100; i++) {
      drops += rollCheckpointDrops(60, -0.5);
    }
    // 6 checkpoints at 1% = 6% total, expect ~6 drops in 100 trials
    expect(drops).toBeLessThan(20);
  });
});
```

Also update the import to include `rollCheckpointDrops`:

```typescript
import {
  // ... existing imports ...
  rollCheckpointDrops,
} from '@/lib/lootV3';
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/lootV3.test.ts -t "rollCheckpointDrops"`
Expected: FAIL with "rollCheckpointDrops is not defined"

**Step 3: Write minimal implementation**

Add after `rollBonusDrop` function in `lib/lootV3.ts`:

```typescript
/**
 * Roll for bonus drops at checkpoints during a session.
 * Replaces the single session-end rollBonusDrop for exploit prevention.
 *
 * @param sessionMinutes - Duration of the reading session in minutes
 * @param dropRateBoost - Value between 0 and 1, added to base chance
 * @returns Number of bonus drops earned
 */
export function rollCheckpointDrops(sessionMinutes: number, dropRateBoost: number): number {
  // Enforce minimum session length
  if (sessionMinutes < MINIMUM_SESSION_MINUTES) {
    return 0;
  }

  // Calculate drop chance (base + boost, but boost can't go negative)
  const effectiveBoost = Math.max(0, dropRateBoost);
  const dropChance = BASE_CHECKPOINT_DROP_CHANCE + effectiveBoost;

  // Full checkpoints
  const fullCheckpoints = Math.floor(sessionMinutes / CHECKPOINT_INTERVAL_MINUTES);

  // Partial checkpoint (remaining minutes)
  const remainingMinutes = sessionMinutes % CHECKPOINT_INTERVAL_MINUTES;
  const partialMultiplier = remainingMinutes / CHECKPOINT_INTERVAL_MINUTES;

  let chestsEarned = 0;

  // Roll full checkpoints
  for (let i = 0; i < fullCheckpoints; i++) {
    if (Math.random() < dropChance) {
      chestsEarned++;
    }
  }

  // Roll partial checkpoint
  if (partialMultiplier > 0) {
    if (Math.random() < dropChance * partialMultiplier) {
      chestsEarned++;
    }
  }

  return chestsEarned;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/lootV3.test.ts -t "rollCheckpointDrops"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/lootV3.ts __tests__/lib/lootV3.test.ts
git commit -m "feat(loot): add rollCheckpointDrops function"
```

---

## Task 3: Update SessionRewardResult Interface

**Files:**
- Modify: `lib/sessionRewards.ts:22-38` (SessionRewardResult interface)

**Step 1: Write the failing test**

Add to `__tests__/lib/sessionRewards.test.ts` in the "basic session processing" describe block:

```typescript
it('should return bonusDropCount instead of bonusDropTriggered', () => {
  const mockBook = createMockBook();
  const mockProgress = createMockProgress();

  const result = processSessionEnd(mockBook, mockProgress, [], 3600);

  expect(typeof result.bonusDropCount).toBe('number');
  expect(result.bonusDropCount).toBeGreaterThanOrEqual(0);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/sessionRewards.test.ts -t "should return bonusDropCount"`
Expected: FAIL with "result.bonusDropCount is undefined"

**Step 3: Write minimal implementation**

In `lib/sessionRewards.ts`, change line 28 from:

```typescript
bonusDropTriggered: boolean;
```

to:

```typescript
bonusDropCount: number;
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/sessionRewards.test.ts -t "should return bonusDropCount"`
Expected: FAIL (implementation not yet updated - expected at this stage)

**Step 5: Commit (skip - will commit with Task 4)**

---

## Task 4: Integrate rollCheckpointDrops into processSessionEnd

**Files:**
- Modify: `lib/sessionRewards.ts:13,206-216,257`

**Step 1: Update import**

Change line 13 from:

```typescript
import { rollBonusDrop } from './lootV3';
```

to:

```typescript
import { rollCheckpointDrops } from './lootV3';
```

**Step 2: Update bonus drop logic**

Replace lines 206-216:

```typescript
// Step 9: Check bonus drop (still uses drop rate boost)
const bonusDropTriggered = rollBonusDrop(totalDropRateBoost);
if (bonusDropTriggered) {
  lootBoxes.push({
    id: generateLootBoxId(),
    // tier intentionally omitted - blank box
    earnedAt: now,
    source: 'bonus_drop',
    bookId: book.id,
  });
}
```

with:

```typescript
// Step 9: Roll checkpoint drops (time-based to prevent exploit)
const sessionMinutes = Math.floor(validSessionSeconds / 60);
const bonusDropCount = rollCheckpointDrops(sessionMinutes, totalDropRateBoost);
for (let i = 0; i < bonusDropCount; i++) {
  lootBoxes.push({
    id: generateLootBoxId(),
    // tier intentionally omitted - blank box
    earnedAt: now,
    source: 'bonus_drop',
    bookId: book.id,
  });
}
```

**Step 3: Update return statement**

Change line 263 from:

```typescript
bonusDropTriggered,
```

to:

```typescript
bonusDropCount,
```

**Step 4: Run all sessionRewards tests**

Run: `npm test -- __tests__/lib/sessionRewards.test.ts`
Expected: Some tests will fail due to `bonusDropTriggered` references

**Step 5: Commit (skip - will commit with Task 5)**

---

## Task 5: Update sessionRewards Tests for New Behavior

**Files:**
- Modify: `__tests__/lib/sessionRewards.test.ts`

**Step 1: Update import**

Change lootV3 import spy setup. Find references to `rollBonusDrop` and replace with `rollCheckpointDrops`.

**Step 2: Update "bonus drop" describe block**

Replace the entire "bonus drop" describe block (lines ~332-385) with:

```typescript
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
```

**Step 3: Update other tests referencing bonusDropTriggered**

Search for `bonusDropTriggered` and update:

1. In "should add bonus loot box when bonus drop triggers" - remove or update
2. In "should create bonus drop boxes without tier" - update mock

Replace the "should create bonus drop boxes without tier" test:

```typescript
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
```

**Step 4: Run all tests**

Run: `npm test -- __tests__/lib/sessionRewards.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/sessionRewards.ts __tests__/lib/sessionRewards.test.ts
git commit -m "feat(session): replace bonus drop with checkpoint system

- Replace single session-end roll with time-based checkpoints
- 10-minute intervals, 1% base + boosts
- 5-minute minimum session requirement
- Prevents exploit from spamming short sessions"
```

---

## Task 6: Run Full Test Suite and Verify

**Files:**
- None (verification only)

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS

**Step 2: Check for any TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any remaining issues from checkpoint drop implementation"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `lib/lootV3.ts` | Add constants + `rollCheckpointDrops()` function |
| `lib/sessionRewards.ts` | Replace `rollBonusDrop` with `rollCheckpointDrops`, change `bonusDropTriggered` to `bonusDropCount` |
| `__tests__/lib/lootV3.test.ts` | Add tests for constants and new function |
| `__tests__/lib/sessionRewards.test.ts` | Update bonus drop tests for new checkpoint behavior |
