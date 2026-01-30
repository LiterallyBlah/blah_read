# Session Rewards Reveal Design

## Overview

Add a reveal sequence after reading sessions that shows unlocked companions (tap-to-flip cards) and earned loot boxes before displaying the results summary.

## Flow

```
Timer ends
    ↓
[Companion Reveals] (if any unlocked)
    - Full screen, one at a time
    - Card flip reveal on tap
    - "Next" button after each reveal
    ↓
[Loot Box Summary] (if any earned)
    - Quick display: "you earned N loot boxes"
    - Visual of box tiers (wood/silver/gold icons)
    - "Continue" button (boxes go to inventory)
    ↓
[Session Results Screen]
    - Existing summary view
    - Shows recap of companions found & boxes earned
```

## Components

### CompanionCardReveal

Full-screen card flip reveal for a single companion.

**Visual States:**

1. **Face-down**
   - Dark card with rarity-colored border glow
   - Common: gray/white glow
   - Rare: blue glow
   - Legendary: gold glow + subtle pulse animation
   - Center shows "?"
   - "tap to reveal" text below

2. **Flipping**
   - 3D flip animation (200-300ms)
   - Card rotates on Y-axis
   - At midpoint, swap face-down for face-up content

3. **Revealed**
   - Companion image (or placeholder)
   - Name
   - Rarity badge `[legendary]`
   - Type: character / creature / object
   - Brief description
   - "next" button (or "continue" if last)

**Props:**
```typescript
interface CompanionCardRevealProps {
  companion: Companion;
  onComplete: () => void;
  isLast: boolean;
}
```

### LootBoxSummary

Quick display of earned loot boxes.

**Layout:**
```
┌─────────────────────────────┐
│                             │
│      you earned loot!       │
│                             │
│   [wood] [wood] [silver]    │
│                             │
│     3 boxes added to        │
│        inventory            │
│                             │
│       [continue]            │
│                             │
└─────────────────────────────┘
```

**Details:**
- Header: "you earned loot!"
- Box icons in a row using PixelSprite chest tiles
- If 5+ boxes, show first few + "+N more"
- Subtext: "N boxes added to inventory"
- Single "continue" button

**Props:**
```typescript
interface LootBoxSummaryProps {
  boxes: Array<{ tier: LootBoxTier }>;
  onContinue: () => void;
}
```

### SessionRewardsReveal

Orchestrator that manages the reveal sequence.

**States:**
```typescript
type RevealPhase =
  | { type: 'companions'; index: number }
  | { type: 'lootBoxes' }
  | { type: 'complete' }
```

**Logic:**
1. If companions exist, start at `{ type: 'companions', index: 0 }`
2. On each companion revealed, increment index
3. When companions done, move to `{ type: 'lootBoxes' }` if boxes exist
4. On loot summary continue, set `{ type: 'complete' }` and navigate to results

**Props:**
```typescript
interface SessionRewardsRevealProps {
  companions: Companion[];
  lootBoxes: Array<{ id: string; tier: LootBoxTier }>;
  sessionResultsData: SessionResultsData;
  bookTitle: string;
}
```

## Data Changes

### SessionResultsData additions

```typescript
interface SessionResultsData {
  // ... existing fields ...

  // Companions unlocked this session
  unlockedCompanions: Companion[];

  // Loot boxes with tiers
  lootBoxesEarned: Array<{
    id: string;
    tier: LootBoxTier;
    source: 'level_up' | 'bonus_drop' | 'completion';
  }>;
}
```

### Loot box tier determination

Roll box tiers at earn time (in `processSessionEnd`) instead of at open time. This allows showing tier visuals in the summary.

## File Structure

**New files:**
```
components/CompanionCardReveal.tsx
components/LootBoxSummary.tsx
components/SessionRewardsReveal.tsx
app/session-rewards-reveal.tsx
```

**Modified files:**
```
lib/sessionRewards.ts        - Roll box tiers at earn time
lib/sessionResultsData.ts    - Add unlockedCompanions, lootBoxesEarned
app/timer/[bookId].tsx       - Navigate to reveal route
components/SessionResultsScreen.tsx - Show recap section
```

## Navigation

```
Before: timer → session-results
After:  timer → session-rewards-reveal → session-results
```

## Not In Scope

- Opening loot boxes during reveal (separate activity)
- Complex animations beyond card flip
- Skip/fast-forward option
