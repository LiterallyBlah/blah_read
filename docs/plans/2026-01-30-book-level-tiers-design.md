# Book Level Tier Visual Design

## Overview

Add visual tier indicators for book levels across the app. Books display colored borders and glows based on their progression level, creating a sense of achievement and prestige.

## Tier System

| Tier | Levels | Color | Glow |
|------|--------|-------|------|
| Common | 1-3 | `colors.rarityCommon` (#555555 gray) | None |
| Rare | 4-6 | `colors.rarityRare` (#4A90D9 blue) | Medium |
| Legendary | 7+ | `colors.rarityLegendary` (#F1C40F gold) | Strong |

## New Utility File

**File:** `lib/bookTier.ts`

```typescript
import type { ThemeColors } from './theme';

export type BookTier = 'common' | 'rare' | 'legendary';

export function getBookTier(level: number): BookTier {
  if (level >= 7) return 'legendary';
  if (level >= 4) return 'rare';
  return 'common';
}

export function getTierColor(tier: BookTier, colors: ThemeColors): string {
  switch (tier) {
    case 'legendary': return colors.rarityLegendary;
    case 'rare': return colors.rarityRare;
    case 'common': return colors.rarityCommon;
  }
}

export function getTierGlow(tier: BookTier): {
  shadowRadius: number;
  shadowOpacity: number;
  elevation: number;
} {
  switch (tier) {
    case 'legendary': return { shadowRadius: 12, shadowOpacity: 0.8, elevation: 8 };
    case 'rare': return { shadowRadius: 8, shadowOpacity: 0.5, elevation: 4 };
    case 'common': return { shadowRadius: 0, shadowOpacity: 0, elevation: 0 };
  }
}
```

## Screen-by-Screen Implementation

### 1. Library Screen

**File:** `app/(tabs)/library.tsx`

**Treatment:** Border color + glow based on tier

```typescript
const level = book.progression?.level || 1;
const tier = getBookTier(level);
const tierColor = getTierColor(tier, colors);
const glow = getTierGlow(tier);

<Pressable
  style={{
    borderWidth: 1,
    borderColor: tierColor,
    shadowColor: tierColor,
    shadowRadius: glow.shadowRadius,
    shadowOpacity: glow.shadowOpacity,
    shadowOffset: { width: 0, height: 0 },
    elevation: glow.elevation,
  }}
>
```

### 2. Book Detail Page

**File:** `app/book/[id].tsx`

**Treatment:** Border + glow on cover, level badge near title

```typescript
const level = book.progression?.level || 1;
const tier = getBookTier(level);
const tierColor = getTierColor(tier, colors);
const glow = getTierGlow(tier);

// Cover with border/glow
<View style={{
  borderWidth: 2,
  borderColor: tierColor,
  shadowColor: tierColor,
  shadowRadius: glow.shadowRadius,
  shadowOpacity: glow.shadowOpacity,
  shadowOffset: { width: 0, height: 0 },
}}>
  <Image ... />
</View>

// Level badge below title
<Text style={{ color: tierColor, fontFamily: FONTS.mono, fontSize: 12 }}>
  lv.{level} [{tier}]
</Text>
```

### 3. Timer Page

**File:** `app/timer/[bookId].tsx`

**Treatment:** Subtle border on cover only (no glow, no badge)

```typescript
const level = book?.progression?.level || 1;
const tier = getBookTier(level);
const tierColor = getTierColor(tier, colors);

<View style={{ borderWidth: 1, borderColor: tierColor }}>
  <Image source={{ uri: book.coverUrl }} style={styles.cover} />
</View>
```

### 4. Home Page

**File:** `app/(tabs)/index.tsx`

**Treatment:** Border color only on "currently reading" card

```typescript
const level = currentBook?.progression?.level || 1;
const tier = getBookTier(level);
const tierColor = getTierColor(tier, colors);

<Pressable
  style={[
    styles.currentBook,
    { borderColor: tierColor },
  ]}
>
```

## Files Changed

| File | Change |
|------|--------|
| `lib/bookTier.ts` | New - tier utility functions |
| `app/(tabs)/library.tsx` | Add border + glow to BookCard |
| `app/book/[id].tsx` | Add border + glow to cover, add level badge |
| `app/timer/[bookId].tsx` | Add border to cover |
| `app/(tabs)/index.tsx` | Add tier border color to current book card |

## Notes

- Reuses existing rarity color system (`colors.rarityCommon/Rare/Legendary`)
- React Native shadows work via `shadow*` props on iOS and `elevation` on Android
- Android elevation shadows are always gray; color only affects iOS
- ~100 lines of changes across 5 files
- No new dependencies required
