# Loot RNG Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve loot box RNG with open-time tier rolling, pity system, and separate luck stats.

**Architecture:** Modify loot system to (1) store blank boxes at earn time, (2) roll tier at open time using layered luck stats + pity, (3) split luck_boost into luck/rare_luck/legendary_luck with rarity-gated availability.

**Tech Stack:** TypeScript, Jest, React Native/Expo

---

## Task 1: Update Types for New Luck Stats and Pity Counter

**Files:**
- Modify: `lib/types.ts:142-168`
- Test: `__tests__/lib/types.test.ts`

**Step 1: Write the failing test for new UserProgress fields**

Add to `__tests__/lib/types.test.ts`:

```typescript
describe('UserProgress V4 fields', () => {
  it('should support goldPityCounter field', () => {
    const progress: UserProgress = {
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
      goldPityCounter: 5,
    };
    expect(progress.goldPityCounter).toBe(5);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/types.test.ts --testNamePattern="goldPityCounter"`
Expected: FAIL with type error

**Step 3: Update UserProgress interface**

In `lib/types.ts`, add to `UserProgress` interface (around line 168):

```typescript
export interface UserProgress {
  // ... existing fields ...
  goldPityCounter?: number; // Pity counter for gold boxes, resets on gold
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/types.test.ts --testNamePattern="goldPityCounter"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/types.ts __tests__/lib/types.test.ts
git commit -m "feat(loot): add goldPityCounter to UserProgress"
```

---

## Task 2: Update LootBoxV3 to Make Tier Optional (Blank Boxes)

**Files:**
- Modify: `lib/types.ts:142-148`
- Test: `__tests__/lib/types.test.ts`

**Step 1: Write the failing test for blank box**

Add to `__tests__/lib/types.test.ts`:

```typescript
describe('LootBoxV3 blank boxes', () => {
  it('should allow tier to be undefined for blank boxes', () => {
    const blankBox: LootBoxV3 = {
      id: 'test-box',
      earnedAt: Date.now(),
      source: 'level_up',
      bookId: 'book-1',
      // tier intentionally omitted
    };
    expect(blankBox.tier).toBeUndefined();
  });

  it('should still allow tier to be set for legacy boxes', () => {
    const legacyBox: LootBoxV3 = {
      id: 'test-box',
      earnedAt: Date.now(),
      source: 'level_up',
      bookId: 'book-1',
      tier: 'gold',
    };
    expect(legacyBox.tier).toBe('gold');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/types.test.ts --testNamePattern="blank boxes"`
Expected: FAIL (tier is currently required)

**Step 3: Update LootBoxV3 interface**

In `lib/types.ts`, change `tier` to optional:

```typescript
export interface LootBoxV3 {
  id: string;
  tier?: LootBoxTier; // Optional: undefined = blank box, roll at open time
  earnedAt: number;
  source: 'level_up' | 'bonus_drop' | 'completion';
  bookId?: string;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/types.test.ts --testNamePattern="blank boxes"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/types.ts __tests__/lib/types.test.ts
git commit -m "feat(loot): make LootBoxV3 tier optional for blank boxes"
```

---

## Task 3: Add New Luck Effect Types to companionEffects.ts

**Files:**
- Modify: `lib/companionEffects.ts:5-10,92-97`
- Test: `__tests__/lib/companionEffects.test.ts`

**Step 1: Write the failing test for new effect types**

Add to `__tests__/lib/companionEffects.test.ts`:

```typescript
describe('new luck effect types', () => {
  it('should include luck, rare_luck, legendary_luck in EFFECT_TYPES', () => {
    expect(EFFECT_TYPES).toContain('luck');
    expect(EFFECT_TYPES).toContain('rare_luck');
    expect(EFFECT_TYPES).toContain('legendary_luck');
    expect(EFFECT_TYPES).not.toContain('luck_boost'); // Old name removed
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/companionEffects.test.ts --testNamePattern="new luck effect types"`
Expected: FAIL

**Step 3: Update EFFECT_TYPES**

In `lib/companionEffects.ts`, replace lines 5-10:

```typescript
export const EFFECT_TYPES = [
  'xp_boost',
  'luck',           // was luck_boost - reduces wood chance
  'rare_luck',      // NEW - increases silver share of non-wood
  'legendary_luck', // NEW - increases gold share of non-wood
  'drop_rate_boost',
  'completion_bonus',
] as const;
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/companionEffects.test.ts --testNamePattern="new luck effect types"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/companionEffects.ts __tests__/lib/companionEffects.test.ts
git commit -m "feat(loot): add rare_luck and legendary_luck effect types"
```

---

## Task 4: Update ActiveEffects Interface

**Files:**
- Modify: `lib/companionEffects.ts:92-97`
- Test: `__tests__/lib/companionEffects.test.ts`

**Step 1: Write the failing test for new ActiveEffects fields**

Add to `__tests__/lib/companionEffects.test.ts`:

```typescript
describe('ActiveEffects interface', () => {
  it('should have luck, rareLuck, legendaryLuck fields', () => {
    const effects: ActiveEffects = {
      xpBoost: 0,
      luck: 0.1,
      rareLuck: 0.05,
      legendaryLuck: 0.15,
      dropRateBoost: 0,
      completionBonus: 0,
    };
    expect(effects.luck).toBe(0.1);
    expect(effects.rareLuck).toBe(0.05);
    expect(effects.legendaryLuck).toBe(0.15);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/companionEffects.test.ts --testNamePattern="ActiveEffects interface"`
Expected: FAIL (luckBoost exists, not luck/rareLuck/legendaryLuck)

**Step 3: Update ActiveEffects interface**

In `lib/companionEffects.ts`, replace the ActiveEffects interface:

```typescript
export interface ActiveEffects {
  xpBoost: number;
  luck: number;           // was luckBoost - reduces wood chance
  rareLuck: number;       // NEW - increases silver share
  legendaryLuck: number;  // NEW - increases gold share
  dropRateBoost: number;
  completionBonus: number;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/companionEffects.test.ts --testNamePattern="ActiveEffects interface"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/companionEffects.ts __tests__/lib/companionEffects.test.ts
git commit -m "feat(loot): update ActiveEffects with new luck fields"
```

---

## Task 5: Update calculateActiveEffects for New Luck Types

**Files:**
- Modify: `lib/companionEffects.ts:99-145`
- Test: `__tests__/lib/companionEffects.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/companionEffects.test.ts`:

```typescript
describe('calculateActiveEffects with new luck types', () => {
  it('should sum luck effects correctly', () => {
    const companions: Companion[] = [
      {
        id: 'c1',
        bookId: 'b1',
        name: 'Test',
        type: 'creature',
        rarity: 'common',
        description: '',
        traits: '',
        visualDescription: '',
        imageUrl: null,
        source: 'discovered',
        unlockMethod: null,
        unlockedAt: null,
        effects: [{ type: 'luck', magnitude: 0.05 }],
      },
      {
        id: 'c2',
        bookId: 'b1',
        name: 'Test2',
        type: 'creature',
        rarity: 'legendary',
        description: '',
        traits: '',
        visualDescription: '',
        imageUrl: null,
        source: 'discovered',
        unlockMethod: null,
        unlockedAt: null,
        effects: [{ type: 'legendary_luck', magnitude: 0.25 }],
      },
    ];

    const result = calculateActiveEffects(companions, []);
    expect(result.luck).toBe(0.05);
    expect(result.rareLuck).toBe(0);
    expect(result.legendaryLuck).toBe(0.25);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/companionEffects.test.ts --testNamePattern="calculateActiveEffects with new luck"`
Expected: FAIL

**Step 3: Update calculateActiveEffects function**

In `lib/companionEffects.ts`, update the function:

```typescript
export function calculateActiveEffects(
  equippedCompanions: Companion[],
  bookGenres: Genre[]
): ActiveEffects {
  const effects: ActiveEffects = {
    xpBoost: 0,
    luck: 0,
    rareLuck: 0,
    legendaryLuck: 0,
    dropRateBoost: 0,
    completionBonus: 0,
  };

  for (const companion of equippedCompanions) {
    if (!companion.effects) {
      continue;
    }

    for (const effect of companion.effects) {
      const applies = !effect.targetGenre || bookGenres.includes(effect.targetGenre);

      if (!applies) {
        continue;
      }

      switch (effect.type) {
        case 'xp_boost':
          effects.xpBoost += effect.magnitude;
          break;
        case 'luck':
          effects.luck += effect.magnitude;
          break;
        case 'rare_luck':
          effects.rareLuck += effect.magnitude;
          break;
        case 'legendary_luck':
          effects.legendaryLuck += effect.magnitude;
          break;
        case 'drop_rate_boost':
          effects.dropRateBoost += effect.magnitude;
          break;
        case 'completion_bonus':
          effects.completionBonus += effect.magnitude;
          break;
      }
    }
  }

  return effects;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/companionEffects.test.ts --testNamePattern="calculateActiveEffects with new luck"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/companionEffects.ts __tests__/lib/companionEffects.test.ts
git commit -m "feat(loot): update calculateActiveEffects for new luck types"
```

---

## Task 6: Add Luck Availability by Rarity

**Files:**
- Modify: `lib/companionEffects.ts`
- Test: `__tests__/lib/companionEffects.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/companionEffects.test.ts`:

```typescript
import { getAvailableLuckTypes } from '@/lib/companionEffects';

describe('getAvailableLuckTypes', () => {
  it('should return only luck for common', () => {
    expect(getAvailableLuckTypes('common')).toEqual(['luck']);
  });

  it('should return luck and rare_luck for rare', () => {
    expect(getAvailableLuckTypes('rare')).toEqual(['luck', 'rare_luck']);
  });

  it('should return all luck types for legendary', () => {
    expect(getAvailableLuckTypes('legendary')).toEqual(['luck', 'rare_luck', 'legendary_luck']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/companionEffects.test.ts --testNamePattern="getAvailableLuckTypes"`
Expected: FAIL (function doesn't exist)

**Step 3: Add getAvailableLuckTypes function**

In `lib/companionEffects.ts`, add:

```typescript
const LUCK_TYPES = ['luck', 'rare_luck', 'legendary_luck'] as const;
type LuckType = typeof LUCK_TYPES[number];

const LUCK_AVAILABILITY: Record<CompanionRarity, LuckType[]> = {
  common: ['luck'],
  rare: ['luck', 'rare_luck'],
  legendary: ['luck', 'rare_luck', 'legendary_luck'],
};

export function getAvailableLuckTypes(rarity: CompanionRarity): LuckType[] {
  return LUCK_AVAILABILITY[rarity];
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/companionEffects.test.ts --testNamePattern="getAvailableLuckTypes"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/companionEffects.ts __tests__/lib/companionEffects.test.ts
git commit -m "feat(loot): add getAvailableLuckTypes for rarity-gated luck"
```

---

## Task 7: Update Consumables with New Luck Stats

**Files:**
- Modify: `lib/consumables.ts:21-41`
- Test: `__tests__/lib/consumables.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/consumables.test.ts`:

```typescript
describe('consumable luck stats', () => {
  it('should have luck effect for weak tier', () => {
    const weak = getConsumablesByTier('weak');
    const luckConsumable = weak.find(c => c.effectType === 'luck');
    expect(luckConsumable).toBeDefined();
    expect(luckConsumable?.magnitude).toBe(0.05);
  });

  it('should not have legendary_luck in weak tier', () => {
    const weak = getConsumablesByTier('weak');
    const legendaryLuck = weak.find(c => c.effectType === 'legendary_luck');
    expect(legendaryLuck).toBeUndefined();
  });

  it('should have rare_luck in medium tier', () => {
    const medium = getConsumablesByTier('medium');
    const rareLuck = medium.find(c => c.effectType === 'rare_luck');
    expect(rareLuck).toBeDefined();
  });

  it('should have legendary_luck in strong tier', () => {
    const strong = getConsumablesByTier('strong');
    const legendaryLuck = strong.find(c => c.effectType === 'legendary_luck');
    expect(legendaryLuck).toBeDefined();
    expect(legendaryLuck?.magnitude).toBe(0.15);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/consumables.test.ts --testNamePattern="consumable luck stats"`
Expected: FAIL

**Step 3: Update consumable definitions**

In `lib/consumables.ts`, update the effect type and consumables:

```typescript
export type ConsumableEffectType =
  | 'xp_boost'
  | 'luck'           // was luck_boost
  | 'rare_luck'      // NEW
  | 'legendary_luck' // NEW
  | 'drop_rate_boost'
  | 'streak_shield'
  | 'box_upgrade'
  | 'guaranteed_companion'
  | 'instant_level';

export const CONSUMABLES: ConsumableDefinition[] = [
  // Weak (Wood box tier)
  { id: 'weak_xp_1', name: 'Minor XP Scroll', description: '+10% XP for 60 min', tier: 'weak', effectType: 'xp_boost', magnitude: 0.10, duration: 60 },
  { id: 'weak_luck_1', name: 'Lucky Penny', description: '+5% luck for 2 hours', tier: 'weak', effectType: 'luck', magnitude: 0.05, duration: 120 },
  { id: 'weak_drop_1', name: 'Treasure Map Scrap', description: '+10% drop rate for 60 min', tier: 'weak', effectType: 'drop_rate_boost', magnitude: 0.10, duration: 60 },
  { id: 'weak_streak_1', name: 'Calendar Page', description: '1-day streak shield', tier: 'weak', effectType: 'streak_shield', magnitude: 1, duration: 0 },

  // Medium (Silver box tier) - now with rare_luck
  { id: 'med_xp_1', name: 'XP Scroll', description: '+25% XP for 90 min', tier: 'medium', effectType: 'xp_boost', magnitude: 0.25, duration: 90 },
  { id: 'med_luck_1', name: 'Four-Leaf Clover', description: '+10% luck for 3 hours', tier: 'medium', effectType: 'luck', magnitude: 0.10, duration: 180 },
  { id: 'med_rare_luck_1', name: 'Silver Horseshoe', description: '+10% rare luck for 3 hours', tier: 'medium', effectType: 'rare_luck', magnitude: 0.10, duration: 180 },
  { id: 'med_drop_1', name: 'Treasure Map', description: '+20% drop rate for 2 hours', tier: 'medium', effectType: 'drop_rate_boost', magnitude: 0.20, duration: 120 },
  { id: 'med_streak_1', name: 'Calendar', description: '3-day streak shield', tier: 'medium', effectType: 'streak_shield', magnitude: 3, duration: 0 },
  { id: 'med_upgrade_1', name: 'Polish Kit', description: 'Upgrade next box tier', tier: 'medium', effectType: 'box_upgrade', magnitude: 1, duration: 0 },

  // Strong (Gold box tier) - now with all luck types
  { id: 'strong_xp_1', name: 'Double XP Tome', description: 'Double XP for 90 min', tier: 'strong', effectType: 'xp_boost', magnitude: 1.0, duration: 90 },
  { id: 'strong_xp_2', name: 'XP Blessing', description: '+50% XP for 4 hours', tier: 'strong', effectType: 'xp_boost', magnitude: 0.50, duration: 240 },
  { id: 'strong_luck_1', name: 'Luck Charm', description: '+15% luck for 5 hours', tier: 'strong', effectType: 'luck', magnitude: 0.15, duration: 300 },
  { id: 'strong_rare_luck_1', name: 'Silver Star', description: '+10% rare luck for 5 hours', tier: 'strong', effectType: 'rare_luck', magnitude: 0.10, duration: 300 },
  { id: 'strong_legendary_luck_1', name: 'Golden Aura', description: '+15% legendary luck for 5 hours', tier: 'strong', effectType: 'legendary_luck', magnitude: 0.15, duration: 300 },
  { id: 'strong_companion_1', name: 'Companion Summon', description: 'Guaranteed companion on next box', tier: 'strong', effectType: 'guaranteed_companion', magnitude: 1, duration: 0 },
  { id: 'strong_level_1', name: 'Time Warp', description: 'Instant level up on current book', tier: 'strong', effectType: 'instant_level', magnitude: 1, duration: 0 },
];
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/consumables.test.ts --testNamePattern="consumable luck stats"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/consumables.ts __tests__/lib/consumables.test.ts
git commit -m "feat(loot): update consumables with new luck stat types"
```

---

## Task 8: Update ConsumableManager for New Luck Types

**Files:**
- Modify: `lib/consumableManager.ts:4-11,38-77`
- Test: `__tests__/lib/consumableManager.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/consumableManager.test.ts`:

```typescript
describe('getActiveEffects with new luck types', () => {
  it('should sum all three luck types separately', () => {
    const active: ActiveConsumable[] = [
      { consumableId: 'weak_luck_1', remainingDuration: 60, appliedAt: Date.now() },
      { consumableId: 'med_rare_luck_1', remainingDuration: 60, appliedAt: Date.now() },
      { consumableId: 'strong_legendary_luck_1', remainingDuration: 60, appliedAt: Date.now() },
    ];

    const effects = getActiveEffects(active);
    expect(effects.luck).toBe(0.05);
    expect(effects.rareLuck).toBe(0.10);
    expect(effects.legendaryLuck).toBe(0.15);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/consumableManager.test.ts --testNamePattern="new luck types"`
Expected: FAIL

**Step 3: Update ConsumableEffects interface and getActiveEffects**

In `lib/consumableManager.ts`:

```typescript
export interface ConsumableEffects {
  xpBoost: number;
  luck: number;           // was luckBoost
  rareLuck: number;       // NEW
  legendaryLuck: number;  // NEW
  dropRateBoost: number;
  streakShieldDays: number;
  boxUpgrade: boolean;
  guaranteedCompanion: boolean;
}

export function getActiveEffects(active: ActiveConsumable[]): ConsumableEffects {
  const effects: ConsumableEffects = {
    xpBoost: 0,
    luck: 0,
    rareLuck: 0,
    legendaryLuck: 0,
    dropRateBoost: 0,
    streakShieldDays: 0,
    boxUpgrade: false,
    guaranteedCompanion: false,
  };

  for (const activeConsumable of active) {
    const consumable = getConsumableById(activeConsumable.consumableId);
    if (!consumable) {
      continue;
    }

    switch (consumable.effectType) {
      case 'xp_boost':
        effects.xpBoost += consumable.magnitude;
        break;
      case 'luck':
        effects.luck += consumable.magnitude;
        break;
      case 'rare_luck':
        effects.rareLuck += consumable.magnitude;
        break;
      case 'legendary_luck':
        effects.legendaryLuck += consumable.magnitude;
        break;
      case 'drop_rate_boost':
        effects.dropRateBoost += consumable.magnitude;
        break;
      case 'streak_shield':
        effects.streakShieldDays += consumable.magnitude;
        break;
      case 'box_upgrade':
        effects.boxUpgrade = true;
        break;
      case 'guaranteed_companion':
        effects.guaranteedCompanion = true;
        break;
    }
  }

  return effects;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/consumableManager.test.ts --testNamePattern="new luck types"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/consumableManager.ts __tests__/lib/consumableManager.test.ts
git commit -m "feat(loot): update consumableManager for new luck types"
```

---

## Task 9: Create Layered Tier Rolling with Pity in lootV3.ts

**Files:**
- Modify: `lib/lootV3.ts`
- Test: `__tests__/lib/lootV3.test.ts`

**Step 1: Write the failing tests**

Add to `__tests__/lib/lootV3.test.ts`:

```typescript
import { rollBoxTierWithPity, PityState, PITY_BONUS_PER_MISS, PITY_HARD_CAP } from '@/lib/lootV3';

describe('rollBoxTierWithPity', () => {
  it('should export pity constants', () => {
    expect(PITY_BONUS_PER_MISS).toBe(0.03);
    expect(PITY_HARD_CAP).toBe(25);
  });

  it('should return gold at hard cap', () => {
    const pityState: PityState = { goldPityCounter: 25 };
    const result = rollBoxTierWithPity(0, 0, 0, pityState);
    expect(result.tier).toBe('gold');
    expect(result.newPityCounter).toBe(0); // Reset after gold
  });

  it('should reset pity counter on gold', () => {
    // Force gold by maxing legendary luck
    const pityState: PityState = { goldPityCounter: 10 };
    // With high pity (10 * 0.03 = 30% bonus), we have good gold chance
    // Run multiple times to verify reset behavior
    let gotGold = false;
    for (let i = 0; i < 100; i++) {
      const result = rollBoxTierWithPity(0.5, 0, 0.5, { goldPityCounter: 24 });
      if (result.tier === 'gold') {
        expect(result.newPityCounter).toBe(0);
        gotGold = true;
        break;
      }
    }
    expect(gotGold).toBe(true);
  });

  it('should increment pity counter on non-gold', () => {
    const pityState: PityState = { goldPityCounter: 5 };
    // With 0 luck, mostly wood/silver
    let gotNonGold = false;
    for (let i = 0; i < 100; i++) {
      const result = rollBoxTierWithPity(0, 0, 0, { goldPityCounter: 5 });
      if (result.tier !== 'gold') {
        expect(result.newPityCounter).toBe(6);
        gotNonGold = true;
        break;
      }
    }
    expect(gotNonGold).toBe(true);
  });

  it('should apply legendary_luck to gold share', () => {
    const trials = 1000;
    let goldCount0 = 0;
    let goldCountHigh = 0;

    for (let i = 0; i < trials; i++) {
      if (rollBoxTierWithPity(0.3, 0, 0, { goldPityCounter: 0 }).tier === 'gold') goldCount0++;
      if (rollBoxTierWithPity(0.3, 0, 0.3, { goldPityCounter: 0 }).tier === 'gold') goldCountHigh++;
    }

    expect(goldCountHigh).toBeGreaterThan(goldCount0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/lootV3.test.ts --testNamePattern="rollBoxTierWithPity"`
Expected: FAIL (function doesn't exist)

**Step 3: Add rollBoxTierWithPity function**

In `lib/lootV3.ts`, add:

```typescript
// Pity system constants
export const PITY_BONUS_PER_MISS = 0.03; // +3% gold chance per non-gold box
export const PITY_HARD_CAP = 25; // Guaranteed gold after 25 non-gold boxes

export interface PityState {
  goldPityCounter: number;
}

export interface TierRollResult {
  tier: LootBoxTier;
  newPityCounter: number;
}

/**
 * Roll for box tier using layered luck system with pity.
 *
 * Layer 1: luck reduces wood chance
 * Layer 2: rare_luck and legendary_luck distribute non-wood between silver/gold
 * Pity: +3% gold per miss, guaranteed at 25
 *
 * @param luck - Generic luck (0-1), reduces wood chance
 * @param rareLuck - Rare luck (0-1), increases silver share (currently unused, silver is common enough)
 * @param legendaryLuck - Legendary luck (0-1), increases gold share
 * @param pityState - Current pity counter state
 */
export function rollBoxTierWithPity(
  luck: number,
  rareLuck: number,
  legendaryLuck: number,
  pityState: PityState
): TierRollResult {
  // Hard cap: guaranteed gold at 25 misses
  if (pityState.goldPityCounter >= PITY_HARD_CAP) {
    return { tier: 'gold', newPityCounter: 0 };
  }

  // Clamp inputs
  const clampedLuck = Math.max(0, Math.min(1, luck));
  const clampedLegendaryLuck = Math.max(0, Math.min(1, legendaryLuck));

  // Calculate pity bonus
  const pityBonus = pityState.goldPityCounter * PITY_BONUS_PER_MISS;

  // Layer 1: Wood vs non-wood
  const woodChance = BOX_TIER_ODDS.wood * (1 - clampedLuck);
  const nonWoodChance = 1 - woodChance;

  // Layer 2: Distribute non-wood between silver and gold
  // Base ratio: 25:5 = 83.3% silver, 16.7% gold
  const baseGoldShare = BOX_TIER_ODDS.gold / (BOX_TIER_ODDS.silver + BOX_TIER_ODDS.gold);

  // legendary_luck triples gold's share per point
  let goldShare = baseGoldShare * (1 + clampedLegendaryLuck * 3) + pityBonus;
  goldShare = Math.min(goldShare, 1); // Cap at 100%

  const silverShare = 1 - goldShare;

  // Calculate final probabilities
  const goldChance = nonWoodChance * goldShare;
  const silverChance = nonWoodChance * silverShare;
  // woodChance already calculated

  // Roll
  const roll = Math.random();

  let tier: LootBoxTier;
  if (roll < goldChance) {
    tier = 'gold';
  } else if (roll < goldChance + silverChance) {
    tier = 'silver';
  } else {
    tier = 'wood';
  }

  // Update pity counter
  const newPityCounter = tier === 'gold' ? 0 : pityState.goldPityCounter + 1;

  return { tier, newPityCounter };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/lootV3.test.ts --testNamePattern="rollBoxTierWithPity"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/lootV3.ts __tests__/lib/lootV3.test.ts
git commit -m "feat(loot): add rollBoxTierWithPity with layered luck and pity system"
```

---

## Task 10: Update sessionRewards.ts to Store Blank Boxes

**Files:**
- Modify: `lib/sessionRewards.ts:161-200`
- Test: `__tests__/lib/sessionRewards.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/sessionRewards.test.ts`:

```typescript
describe('blank box earning', () => {
  it('should create boxes without tier', () => {
    const book = createTestBook({ totalSeconds: 0 });
    const progress = createTestProgress();
    const companions: Companion[] = [];

    // 1 hour session = 1 level = 1 box
    const result = processSessionEnd(book, progress, companions, 3600, false);

    expect(result.lootBoxes.length).toBe(1);
    expect(result.lootBoxes[0].tier).toBeUndefined();
    expect(result.lootBoxes[0].source).toBe('level_up');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/sessionRewards.test.ts --testNamePattern="blank box earning"`
Expected: FAIL (boxes currently have tier)

**Step 3: Update processSessionEnd to create blank boxes**

In `lib/sessionRewards.ts`, update the loot box creation section (around lines 161-200):

```typescript
  // Step 8: Create blank loot boxes (tier determined at open time)
  const lootBoxes: LootBoxV3[] = [];

  // Level up boxes
  const regularLevelsGained = levelResult.levelsGained;
  for (let i = 0; i < regularLevelsGained; i++) {
    lootBoxes.push({
      id: generateLootBoxId(),
      // tier intentionally omitted - blank box
      earnedAt: now,
      source: 'level_up',
      bookId: book.id,
    });
  }

  // Completion bonus boxes
  for (let i = 0; i < completionBonusLevels; i++) {
    lootBoxes.push({
      id: generateLootBoxId(),
      // tier intentionally omitted - blank box
      earnedAt: now,
      source: 'completion',
      bookId: book.id,
    });
  }

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

Also remove the `rollBoxTier` import and calls since they're no longer used at earn time.

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/sessionRewards.test.ts --testNamePattern="blank box earning"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/sessionRewards.ts __tests__/lib/sessionRewards.test.ts
git commit -m "feat(loot): store blank boxes at earn time"
```

---

## Task 11: Update combineEffects in sessionRewards.ts

**Files:**
- Modify: `lib/sessionRewards.ts:55-81`
- Test: `__tests__/lib/sessionRewards.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/sessionRewards.test.ts`:

```typescript
describe('combineEffects with new luck types', () => {
  it('should combine all three luck types from companions and consumables', () => {
    // This tests the internal combineEffects behavior through processSessionEnd
    const book = createTestBook({ normalizedGenres: ['Fantasy'] });
    const progress = createTestProgress({
      activeConsumables: [
        { consumableId: 'weak_luck_1', remainingDuration: 60, appliedAt: Date.now() },
      ],
    });
    const companions: Companion[] = [
      createTestCompanion({
        effects: [{ type: 'legendary_luck', magnitude: 0.25 }],
      }),
    ];

    const result = processSessionEnd(book, progress, companions, 60, false);

    expect(result.activeEffects.luck).toBe(0.05); // from consumable
    expect(result.activeEffects.legendaryLuck).toBe(0.25); // from companion
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/sessionRewards.test.ts --testNamePattern="combineEffects with new luck"`
Expected: FAIL

**Step 3: Update combineEffects function**

In `lib/sessionRewards.ts`, update the combineEffects function:

```typescript
function combineEffects(
  companionEffects: ActiveEffects,
  consumableEffects: ReturnType<typeof getConsumableEffects>
): {
  totalXpBoost: number;
  totalLuck: number;
  totalRareLuck: number;
  totalLegendaryLuck: number;
  totalDropRateBoost: number;
  combinedActiveEffects: ActiveEffects;
} {
  const totalXpBoost = companionEffects.xpBoost + consumableEffects.xpBoost;
  const totalLuck = companionEffects.luck + consumableEffects.luck;
  const totalRareLuck = companionEffects.rareLuck + consumableEffects.rareLuck;
  const totalLegendaryLuck = companionEffects.legendaryLuck + consumableEffects.legendaryLuck;
  const totalDropRateBoost = companionEffects.dropRateBoost + consumableEffects.dropRateBoost;

  const combinedActiveEffects: ActiveEffects = {
    xpBoost: totalXpBoost,
    luck: totalLuck,
    rareLuck: totalRareLuck,
    legendaryLuck: totalLegendaryLuck,
    dropRateBoost: totalDropRateBoost,
    completionBonus: companionEffects.completionBonus,
  };

  return {
    totalXpBoost,
    totalLuck,
    totalRareLuck,
    totalLegendaryLuck,
    totalDropRateBoost,
    combinedActiveEffects,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/sessionRewards.test.ts --testNamePattern="combineEffects with new luck"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/sessionRewards.ts __tests__/lib/sessionRewards.test.ts
git commit -m "feat(loot): update combineEffects for new luck types"
```

---

## Task 12: Create openLootBoxV3 Function with Tier Rolling and Pity

**Files:**
- Create: `lib/lootBoxV3.ts`
- Test: `__tests__/lib/lootBoxV3.test.ts`

**Step 1: Write the failing test**

Create `__tests__/lib/lootBoxV3.test.ts`:

```typescript
import { openLootBoxV3, OpenLootBoxResult } from '@/lib/lootBoxV3';
import { LootBoxV3, UserProgress, Companion } from '@/lib/types';
import { Genre } from '@/lib/genres';

describe('openLootBoxV3', () => {
  const createBlankBox = (): LootBoxV3 => ({
    id: 'test-box',
    earnedAt: Date.now(),
    source: 'level_up',
    bookId: 'book-1',
  });

  const createLegacyBox = (tier: 'wood' | 'silver' | 'gold'): LootBoxV3 => ({
    id: 'test-box',
    tier,
    earnedAt: Date.now(),
    source: 'level_up',
    bookId: 'book-1',
  });

  const createProgress = (pityCounter: number = 0): UserProgress => ({
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
    goldPityCounter: pityCounter,
  });

  it('should roll tier at open time for blank boxes', () => {
    const box = createBlankBox();
    const progress = createProgress(0);

    const result = openLootBoxV3(box, progress, [], []);

    expect(result.rolledTier).toBeDefined();
    expect(['wood', 'silver', 'gold']).toContain(result.rolledTier);
  });

  it('should use existing tier for legacy boxes', () => {
    const box = createLegacyBox('gold');
    const progress = createProgress(0);

    const result = openLootBoxV3(box, progress, [], []);

    expect(result.rolledTier).toBe('gold');
  });

  it('should update pity counter in returned progress', () => {
    const box = createBlankBox();
    const progress = createProgress(5);

    const result = openLootBoxV3(box, progress, [], []);

    if (result.rolledTier === 'gold') {
      expect(result.updatedProgress.goldPityCounter).toBe(0);
    } else {
      expect(result.updatedProgress.goldPityCounter).toBe(6);
    }
  });

  it('should guarantee gold at pity cap', () => {
    const box = createBlankBox();
    const progress = createProgress(25);

    const result = openLootBoxV3(box, progress, [], []);

    expect(result.rolledTier).toBe('gold');
    expect(result.updatedProgress.goldPityCounter).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/lootBoxV3.test.ts`
Expected: FAIL (module doesn't exist)

**Step 3: Create lootBoxV3.ts**

Create `lib/lootBoxV3.ts`:

```typescript
import { LootBoxV3, LootBoxTier, UserProgress, Companion } from './types';
import { Genre } from './genres';
import { calculateActiveEffects } from './companionEffects';
import { getActiveEffects as getConsumableEffects } from './consumableManager';
import { rollBoxTierWithPity, rollLootForTier, LootResult } from './lootV3';

export interface OpenLootBoxResult {
  rolledTier: LootBoxTier;
  lootResult: LootResult;
  updatedProgress: UserProgress;
}

/**
 * Open a V3 loot box, rolling tier at open time if blank.
 * Applies luck stats and pity system.
 *
 * @param box - The loot box to open
 * @param progress - Current user progress (for pity counter and consumables)
 * @param equippedCompanions - Currently equipped companions
 * @param bookGenres - Genres of the current book (for genre-targeted effects)
 */
export function openLootBoxV3(
  box: LootBoxV3,
  progress: UserProgress,
  equippedCompanions: Companion[],
  bookGenres: Genre[]
): OpenLootBoxResult {
  let rolledTier: LootBoxTier;
  let newPityCounter: number;

  // Check if this is a legacy box with pre-determined tier
  if (box.tier !== undefined) {
    // Legacy box: use existing tier, don't update pity
    rolledTier = box.tier;
    newPityCounter = progress.goldPityCounter ?? 0;

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

  // Roll loot contents based on tier
  const lootResult = rollLootForTier(rolledTier);

  // Create updated progress with new pity counter
  const updatedProgress: UserProgress = {
    ...progress,
    goldPityCounter: newPityCounter,
  };

  return {
    rolledTier,
    lootResult,
    updatedProgress,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/lootBoxV3.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/lootBoxV3.ts __tests__/lib/lootBoxV3.test.ts
git commit -m "feat(loot): create openLootBoxV3 with tier rolling and pity"
```

---

## Task 13: Update loot-box.tsx UI to Use New Opening Logic

**Files:**
- Modify: `app/loot-box.tsx:44-130`

**Step 1: No new test needed (UI integration)**

This is UI integration - manual testing.

**Step 2: Update imports and handleOpenBox**

In `app/loot-box.tsx`, update imports:

```typescript
import { openLootBoxV3 } from '@/lib/lootBoxV3';
import { openLootBox, getPoolCompanions } from '@/lib/lootBox';
import type { Companion, LootBoxV3, LootBoxTier } from '@/lib/types';
import { ConsumableDefinition } from '@/lib/consumables';
import { addActiveConsumable } from '@/lib/consumableManager';
import { storage } from '@/lib/storage';
```

**Step 3: Update handleOpenBox function**

Replace the V3 box handling section in handleOpenBox:

```typescript
async function handleOpenBox() {
  if (revealing || boxCount === 0) return;
  setRevealing(true);

  const [books, progress, loadout] = await Promise.all([
    storage.getBooks(),
    storage.getProgress(),
    storage.getLoadout?.() ?? { slots: [null, null, null], unlockedSlots: 1 },
  ]);

  // Get equipped companions
  const allCompanions = books.flatMap(b => b.companions?.unlockedCompanions ?? []);
  const equippedCompanions = (loadout.slots ?? [])
    .filter((id): id is string => id !== null)
    .map(id => allCompanions.find(c => c.id === id))
    .filter((c): c is Companion => c !== undefined);

  // Get current book for genre targeting
  const currentBook = books
    .filter(b => b.status === 'reading')
    .sort((a, b) => b.totalReadingTime - a.totalReadingTime)[0];
  const bookGenres = currentBook?.normalizedGenres ?? [];

  // Check if we have V3 boxes first
  const v3Boxes = progress.lootBoxesV3 || [];
  if (v3Boxes.length > 0) {
    const boxToOpen = v3Boxes[0];

    // Open using new system with tier rolling and pity
    const { rolledTier, lootResult, updatedProgress } = openLootBoxV3(
      boxToOpen,
      progress,
      equippedCompanions,
      bookGenres
    );

    // Remove the opened box
    updatedProgress.lootBoxesV3 = v3Boxes.slice(1);

    if (lootResult.category === 'consumable' && lootResult.consumable) {
      // Handle consumable drop
      updatedProgress.activeConsumables = addActiveConsumable(
        updatedProgress.activeConsumables || [],
        lootResult.consumable
      );
      await storage.saveProgress(updatedProgress);

      setRevealedConsumable(lootResult.consumable);
      setRevealedTier(rolledTier);
      setRevealedCompanion(null);
    } else if (lootResult.category === 'companion' && lootResult.companionRarity) {
      // Handle companion drop - get from pool
      const pool = getPoolCompanions(books);
      const { companion } = openLootBox(pool, currentBook?.id || null);

      if (companion) {
        // Update book's companion state
        const book = books.find(b => b.id === companion.bookId);
        if (book?.companions) {
          const poolIndex = book.companions.poolQueue.companions.findIndex(
            c => c.id === companion.id
          );
          if (poolIndex !== -1) {
            book.companions.poolQueue.companions[poolIndex] = companion;
            book.companions.unlockedCompanions.push(companion);
            await storage.saveBook(book);
          }
        }

        await storage.saveProgress(updatedProgress);
        setRevealedCompanion(companion);
        setRevealedTier(rolledTier);
        setRevealedConsumable(null);
      } else {
        // No companion available - give a fallback consumable
        const fallbackConsumable = {
          id: 'weak_xp_1',
          name: 'Minor XP Scroll',
          description: '+10% XP for 60 min',
          tier: 'weak' as const,
          effectType: 'xp_boost' as const,
          magnitude: 0.10,
          duration: 60,
        };
        updatedProgress.activeConsumables = addActiveConsumable(
          updatedProgress.activeConsumables || [],
          fallbackConsumable
        );
        await storage.saveProgress(updatedProgress);

        setRevealedConsumable(fallbackConsumable);
        setRevealedTier(rolledTier);
        setRevealedCompanion(null);
      }
    }

    const newV3Count = updatedProgress.lootBoxesV3?.length || 0;
    const v2Count = progress.lootBoxes?.availableBoxes?.length || 0;
    setBoxCount(v2Count + newV3Count);
    setBoxesV3(updatedProgress.lootBoxesV3 || []);
    setRevealing(false);
    return;
  }

  // ... rest of V2 fallback code stays the same ...
}
```

**Step 4: Verify manually**

Open the app and test opening loot boxes. Verify:
- Blank boxes roll tier at open time
- Pity counter increases (check storage/debug)
- Legacy boxes with tier still work

**Step 5: Commit**

```bash
git add app/loot-box.tsx
git commit -m "feat(loot): integrate openLootBoxV3 into loot box UI"
```

---

## Task 14: Fix Remaining Type Errors and Run Full Test Suite

**Files:**
- Various files with type errors

**Step 1: Run full test suite**

Run: `npm test`

**Step 2: Fix any type errors**

Common fixes needed:
- Update any code still using `luckBoost` to use `luck`
- Update any code creating `ActiveEffects` objects
- Fix any imports

**Step 3: Run tests again**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add -A
git commit -m "fix(loot): fix remaining type errors from luck stat migration"
```

---

## Task 15: Final Integration Test and Cleanup

**Files:**
- All modified files

**Step 1: Run full test suite**

Run: `npm test`
Expected: All pass

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Manual smoke test**

1. Start a reading session
2. Level up a book
3. Check that blank boxes are earned (inspect storage)
4. Open a loot box
5. Verify tier is rolled at open time
6. Verify pity counter updates

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(loot): complete loot RNG improvements implementation"
```

---

## Summary

This plan implements:

1. **Tasks 1-2**: Type changes for pity counter and blank boxes
2. **Tasks 3-6**: New luck stat types in companionEffects
3. **Tasks 7-8**: Updated consumables with new luck stats
4. **Task 9**: Layered tier rolling with pity system
5. **Tasks 10-11**: Session rewards updated for blank boxes
6. **Task 12**: New openLootBoxV3 function
7. **Task 13**: UI integration
8. **Tasks 14-15**: Cleanup and verification

Each task is TDD with small commits. Total: ~15 commits, each under 5 minutes.
