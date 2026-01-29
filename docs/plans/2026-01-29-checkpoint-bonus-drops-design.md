# Checkpoint-Based Bonus Drop System

## Problem

The current bonus drop system rolls once per session regardless of length. This can be exploited by spamming short sessions to farm loot boxes.

## Solution

Replace the single session-end roll with time-based checkpoint rolls during the session.

## Core Mechanics

| Parameter | Value |
|-----------|-------|
| Checkpoint interval | 10 minutes |
| Base chance per checkpoint | 1% |
| Boost formula | 1% + dropRateBoost (additive) |
| Minimum session length | 5 minutes |
| Partial checkpoints | Proportional chance for remaining time |

### Example: 25-minute session with 30% drop rate boost

- Checkpoint 1 (10 min): 31% chance
- Checkpoint 2 (20 min): 31% chance
- Partial (5 min): 15.5% chance (50% of 31%)
- Total: 3 independent rolls

### Comparison with Current System

| Scenario | Current (exploited) | New System |
|----------|---------------------|------------|
| 60x 1-min sessions, 30% boost | ~100% (multiple drops) | 0 drops (under 5 min minimum) |
| 1x 60-min session, no boost | 0% | ~6% chance of at least 1 |
| 1x 60-min session, 30% boost | 30% | ~86% chance of at least 1 |

## Algorithm

```typescript
function rollCheckpointDrops(sessionMinutes: number, dropRateBoost: number): number {
  if (sessionMinutes < 5) return 0;

  const dropChance = 0.01 + dropRateBoost;
  const fullCheckpoints = Math.floor(sessionMinutes / 10);
  const remainingMinutes = sessionMinutes % 10;
  const partialMultiplier = remainingMinutes / 10;

  let chestsEarned = 0;

  for (let i = 0; i < fullCheckpoints; i++) {
    if (Math.random() < dropChance) chestsEarned++;
  }

  if (partialMultiplier > 0) {
    if (Math.random() < dropChance * partialMultiplier) chestsEarned++;
  }

  return chestsEarned;
}
```

## Implementation Changes

### lib/lootV3.ts

- Add constants:
  - `BASE_CHECKPOINT_DROP_CHANCE = 0.01`
  - `CHECKPOINT_INTERVAL_MINUTES = 10`
  - `MINIMUM_SESSION_MINUTES = 5`
- Add `rollCheckpointDrops(sessionMinutes, dropRateBoost)` function

### lib/sessionRewards.ts

- Replace `rollBonusDrop()` call with `rollCheckpointDrops()`
- Generate multiple `bonus_drop` loot boxes based on result
- Update `SessionRewardResult.bonusDropTriggered` to `bonusDropCount: number`

### Tests

- Update existing bonus drop tests in `__tests__/lib/lootV3.test.ts`
- Add checkpoint calculation tests:
  - Full checkpoints only
  - Partial checkpoint proportional roll
  - Minimum session threshold (under 5 min returns 0)
  - Boost application
