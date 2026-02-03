# Effect Chance System Design

## Problem

Effects are currently assigned by the LLM during companion research, leading to inconsistent results. Rares can have no effects, commons can have multiple - the opposite of intended design.

## Solution

Decouple effect assignment from the LLM. Use code-based probability rolls based on rarity.

## Effect Chances

| Rarity | 1st Effect | 2nd Effect |
|--------|-----------|------------|
| Common | 25% | 5% |
| Rare | 100% | 20% |
| Legendary | 100% | 50% |

Second effect only rolls if first effect was granted.

### Resulting Distribution (Common)
- 75% get no effects
- ~20% get exactly 1 effect
- ~1.25% get 2 effects

## Effect Type Selection

- Random pick from `getAvailableEffectTypes(rarity)`
- Second effect must be different type from first (magnitude doesn't count as different)
- For `xp_boost`: 50% chance to target a book genre, otherwise global

## Implementation

### 1. New Constants & Functions (`lib/companionEffects.ts`)

```typescript
const EFFECT_CHANCES: Record<CompanionRarity, { first: number; second: number }> = {
  common: { first: 0.25, second: 0.05 },
  rare: { first: 1.0, second: 0.20 },
  legendary: { first: 1.0, second: 0.50 },
};

function rollCompanionEffects(rarity: CompanionRarity, bookGenres?: Genre[]): CompanionEffect[]
```

### 2. Update Research Flow (`lib/companionResearch.ts`)

- Remove effect instructions from `buildResearchPrompt()`
- In `parseResearchResponse()`: call `rollCompanionEffects()` instead of parsing LLM effects
- Pass book genres for potential xp_boost targeting

### 3. Backfill Function

- `backfillCompanionEffects(companions)`: Re-rolls effects for existing companions
- Triggered manually via debug button in config screen

### 4. Debug UI

- Add "Re-roll companion effects" button under Config > Debug
- Useful for fixing existing companions and testing
