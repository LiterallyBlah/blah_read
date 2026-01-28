# Loot RNG Improvements Design

## Overview

Improvements to the V3 loot system addressing three issues:
1. Gold boxes are too rare even with luck boosts
2. Box tier locked at earn time prevents strategic use of luck buffs
3. Single luck stat doesn't provide meaningful progression toward rare/legendary drops

## Changes Summary

1. **Decouple tier from earn time** - Boxes are blank when earned, tier determined at open time
2. **Pity system** - Hybrid with +3% per miss, hard cap at 25 boxes, resets only on gold
3. **Separate luck tiers** - Layered system with `luck`, `rare_luck`, `legendary_luck`

---

## 1. New Luck Stats & Box Tier Rolling

### New Stats

The single `luck_boost` stat is replaced with three stats:

| Stat | Effect |
|------|--------|
| `luck` | Reduces wood box chance, shifting probability to non-wood |
| `rare_luck` | Of the non-wood probability, increases silver's share |
| `legendary_luck` | Of the non-wood probability, increases gold's share |

### Layered Roll Formula

```
Step 1: Roll wood vs non-wood
  wood_chance = 0.70 * (1 - luck)
  non_wood_chance = 1 - wood_chance

Step 2: If non-wood, distribute between silver and gold
  Base ratio: silver 83.3%, gold 16.7% (preserves current 25:5 ratio)

  Adjusted:
    gold_share = 0.167 * (1 + legendary_luck * 3)    // legendary_luck triples gold's share per point
    silver_share = 1 - gold_share                     // rare_luck could boost this, but silver is already common

  Final:
    silver_chance = non_wood_chance * silver_share
    gold_chance = non_wood_chance * gold_share
```

### Example at 30% luck + 20% legendary_luck

- Wood: 70% * (1 - 0.30) = 49%
- Non-wood: 51%
- Gold share: 16.7% * (1 + 0.20 * 3) = 26.7%
- Final: 49% wood, 37.4% silver, 13.6% gold

---

## 2. Pity System

### Mechanics

- Track `goldPityCounter` on `UserProgress` (integer, starts at 0)
- Counter increments by 1 each time a box is opened and the result is NOT gold
- Counter resets to 0 when a gold box is opened

### Effect on Gold Chance

```
pity_bonus = goldPityCounter * 0.03    // +3% per miss
hard_cap_reached = goldPityCounter >= 25

if hard_cap_reached:
  gold_chance = 1.0    // Guaranteed gold
else:
  // Apply pity bonus to the gold calculation from Section 1
  gold_share = 0.167 * (1 + legendary_luck * 3) + pity_bonus
  gold_share = min(gold_share, 1.0)    // Cap at 100%
```

### Progression Example

| Boxes Without Gold | Pity Bonus | Base Gold (no luck) | Effective Gold |
|--------------------|------------|---------------------|----------------|
| 0 | +0% | 5% | 5% |
| 5 | +15% | 5% | 20% |
| 10 | +30% | 5% | 35% |
| 15 | +45% | 5% | 50% |
| 20 | +60% | 5% | 65% |
| 25 | hard cap | 5% | 100% |

### Storage

```typescript
interface UserProgress {
  // ... existing fields
  goldPityCounter: number;  // New field, default 0
}
```

---

## 3. Blank Boxes & Open-Time Tier Rolling

### Earning Boxes

When a box is earned (level up, completion, bonus drop), it stores no tier:

```typescript
interface LootBoxV3 {
  id: string;
  earnedAt: number;
  source: 'level_up' | 'completion' | 'bonus_drop';
  bookId: string;
  // tier field REMOVED - no longer stored at earn time
}
```

### Opening Boxes

Tier is determined at open time using current stats:

```typescript
function openLootBox(
  box: LootBoxV3,
  progress: UserProgress,
  equippedCompanions: Companion[],
  bookGenres: Genre[]
): { tier: LootBoxTier; result: LootResult; updatedProgress: UserProgress }
```

1. Calculate active effects from companions + consumables (as today)
2. Get `luck`, `rare_luck`, `legendary_luck` from combined effects
3. Get `goldPityCounter` from progress
4. Roll tier using layered formula + pity bonus
5. If gold: reset pity counter to 0
6. If not gold: increment pity counter by 1
7. Roll contents using existing Layer 2 and Layer 3 logic
8. Return result with updated progress

### Migration

Existing `LootBoxV3` records with a `tier` field become "legacy boxes." On open:
- If `tier` exists, use it (honor the original roll)
- If `tier` is undefined, roll at open time

This ensures players don't lose value from boxes already earned.

---

## 4. Companion & Consumable Luck Availability

### Companion Effect Availability by Rarity

| Rarity | Can Roll |
|--------|----------|
| Common | `luck` only |
| Rare | `luck`, `rare_luck` |
| Legendary | `luck`, `rare_luck`, `legendary_luck` |

When a companion is generated, if it rolls a luck-type effect, the specific luck stat is chosen from the available pool for that rarity.

### Updated Effect Types

```typescript
type EffectType =
  | 'xp_boost'
  | 'luck'              // was luck_boost, now generic luck
  | 'rare_luck'         // NEW
  | 'legendary_luck'    // NEW
  | 'drop_rate_boost'
  | 'completion_bonus';
```

### Consumable Availability by Tier

| Tier | Can Grant |
|------|-----------|
| Weak | `luck` only |
| Medium | `luck`, `rare_luck` |
| Strong | `luck`, `rare_luck`, `legendary_luck` |

### Updated Consumables

| Tier | Old | New |
|------|-----|-----|
| Weak | Lucky Penny (+5% luck) | Lucky Penny (+5% luck) |
| Medium | Four-Leaf Clover (+15% luck) | Four-Leaf Clover (+10% luck, +10% rare_luck) |
| Strong | Luck Charm (+30% luck) | Luck Charm (+15% luck, +10% rare_luck, +15% legendary_luck) |

This gives higher-tier consumables more impactful effects on gold chance specifically.

---

## 5. ActiveEffects & Integration Points

### Updated ActiveEffects Interface

```typescript
interface ActiveEffects {
  xpBoost: number;
  luck: number;           // was luckBoost
  rareLuck: number;       // NEW
  legendaryLuck: number;  // NEW
  dropRateBoost: number;
  completionBonus: number;
}
```

### Files Requiring Changes

| File | Changes |
|------|---------|
| `lib/types.ts` | Update `LootBoxV3` (remove tier), add `goldPityCounter` to `UserProgress` |
| `lib/lootV3.ts` | New `rollBoxTierWithPity()` function using layered formula |
| `lib/companionEffects.ts` | Update `EffectType`, `ActiveEffects`, effect availability logic |
| `lib/consumables.ts` | Update consumable definitions with new luck stats |
| `lib/consumableManager.ts` | Update `getActiveEffects()` to sum all three luck types |
| `lib/sessionRewards.ts` | Remove tier rolling at earn time, store blank boxes |
| `lib/lootBox.ts` | Add tier rolling at open time, pity counter logic |
| `app/loot-box.tsx` | Pass progress/companions to open function, handle updated progress |

### Data Migration

```typescript
// In migration or on-load
if (progress.goldPityCounter === undefined) {
  progress.goldPityCounter = 0;
}

// Existing boxes with tier remain valid (legacy handling)
```

---

## Summary

These changes transform the loot system from "luck slightly improves your odds" to a more engaging system where:

- **Blank boxes** let players strategically time their opens with active buffs
- **Pity system** guarantees gold within 25 boxes, eliminating extreme bad luck
- **Separate luck stats** create meaningful progression paths (chase legendary companions for legendary_luck)
- **Rarity-gated availability** makes higher-rarity companions/consumables feel more valuable
