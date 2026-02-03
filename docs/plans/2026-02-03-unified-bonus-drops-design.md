# Unified Bonus Drops Design

## Problem

Currently, bonus drops during reading sessions always yield loot boxes. This feels repetitive - like always finding the same type of chest.

## Solution

Create a unified drop table where bonus drops can be consumables, loot boxes, OR companions directly. Feels more like "walking in the wilderness and coming across something."

## Drop Table

| Drop | Weight | ~Chance |
|------|--------|---------|
| Weak consumable | 40 | ~33% |
| Medium consumable | 25 | ~21% |
| Wood loot box | 20 | ~17% |
| Strong consumable | 12 | ~10% |
| Silver loot box | 10 | ~8% |
| Common companion | 6 | ~5% |
| Gold loot box | 4 | ~3% |
| Rare companion | 2 | ~1.7% |
| Legendary companion | 1 | ~0.8% |

**Distribution:**
- ~64% consumable
- ~28% loot box
- ~8% companion

## Companion Drops

- Pull from **current book's pool only** (not global)
- Thematic: you're experiencing that book, so you encounter its characters
- Loot boxes already pull from general pool, this gives book-specific path

**Fallback when pool is empty:**
- If companion rarity rolled but no companion available at that rarity → fall back to loot box of equivalent tier
- Common companion → Wood box
- Rare companion → Silver box
- Legendary companion → Gold box

## Implementation

### New Types

```typescript
type BonusDropType =
  | { type: 'consumable'; tier: ConsumableTier }
  | { type: 'lootbox'; tier: LootBoxTier }
  | { type: 'companion'; rarity: CompanionRarity };
```

### New Function

```typescript
function rollBonusDrop(): BonusDropType
```

### Integration Points

1. `lib/lootV3.ts` - Add drop table and roll function
2. `lib/sessionRewards.ts` - Use new roll function for bonus drops
3. Session results screen - Display varied drop types

## Existing Drop Mechanics

The current system has:
- `BASE_CHECKPOINT_DROP_CHANCE = 0.01` (1% per checkpoint)
- `drop_rate_boost` effect increases this chance
- Checkpoints every ~5 minutes of reading

These mechanics stay the same - only WHAT drops changes.
