# Book Level Tier Visual Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add visual tier indicators (borders + glow) for book levels across library, book detail, timer, and home screens.

**Architecture:** Create a utility module `lib/bookTier.ts` with pure functions for tier calculation, then integrate into 4 screens via their existing style systems. Each screen has different treatment: library (border + glow), book detail (border + glow + badge), timer (border only), home (border only).

**Tech Stack:** TypeScript, React Native (View/Image shadows), existing theme system.

---

## Task 1: Create bookTier Utility Module

**Files:**
- Create: `lib/bookTier.ts`
- Test: `__tests__/lib/bookTier.test.ts`

**Step 1: Write the failing tests**

```typescript
// __tests__/lib/bookTier.test.ts
import { getBookTier, getTierGlow } from '@/lib/bookTier';

describe('getBookTier', () => {
  it('returns common for levels 1-3', () => {
    expect(getBookTier(1)).toBe('common');
    expect(getBookTier(2)).toBe('common');
    expect(getBookTier(3)).toBe('common');
  });

  it('returns rare for levels 4-6', () => {
    expect(getBookTier(4)).toBe('rare');
    expect(getBookTier(5)).toBe('rare');
    expect(getBookTier(6)).toBe('rare');
  });

  it('returns legendary for level 7+', () => {
    expect(getBookTier(7)).toBe('legendary');
    expect(getBookTier(10)).toBe('legendary');
    expect(getBookTier(99)).toBe('legendary');
  });

  it('handles edge case of level 0 as common', () => {
    expect(getBookTier(0)).toBe('common');
  });
});

describe('getTierGlow', () => {
  it('returns no glow for common tier', () => {
    const glow = getTierGlow('common');
    expect(glow.shadowRadius).toBe(0);
    expect(glow.shadowOpacity).toBe(0);
    expect(glow.elevation).toBe(0);
  });

  it('returns medium glow for rare tier', () => {
    const glow = getTierGlow('rare');
    expect(glow.shadowRadius).toBe(8);
    expect(glow.shadowOpacity).toBe(0.5);
    expect(glow.elevation).toBe(4);
  });

  it('returns strong glow for legendary tier', () => {
    const glow = getTierGlow('legendary');
    expect(glow.shadowRadius).toBe(12);
    expect(glow.shadowOpacity).toBe(0.8);
    expect(glow.elevation).toBe(8);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/bookTier.test.ts`
Expected: FAIL with "Cannot find module '@/lib/bookTier'"

**Step 3: Write the implementation**

```typescript
// lib/bookTier.ts
export type BookTier = 'common' | 'rare' | 'legendary';

/**
 * Get the tier for a book based on its level
 * - Common: levels 1-3
 * - Rare: levels 4-6
 * - Legendary: level 7+
 */
export function getBookTier(level: number): BookTier {
  if (level >= 7) return 'legendary';
  if (level >= 4) return 'rare';
  return 'common';
}

/**
 * Get the rarity color key for a tier (matches theme.ts rarity colors)
 */
export function getTierColorKey(tier: BookTier): 'rarityCommon' | 'rarityRare' | 'rarityLegendary' {
  switch (tier) {
    case 'legendary': return 'rarityLegendary';
    case 'rare': return 'rarityRare';
    case 'common': return 'rarityCommon';
  }
}

/**
 * Get shadow/glow properties for a tier
 * Returns values for React Native shadow props (iOS) and elevation (Android)
 */
export function getTierGlow(tier: BookTier): {
  shadowRadius: number;
  shadowOpacity: number;
  elevation: number;
} {
  switch (tier) {
    case 'legendary':
      return { shadowRadius: 12, shadowOpacity: 0.8, elevation: 8 };
    case 'rare':
      return { shadowRadius: 8, shadowOpacity: 0.5, elevation: 4 };
    case 'common':
      return { shadowRadius: 0, shadowOpacity: 0, elevation: 0 };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/bookTier.test.ts`
Expected: PASS (all 7 tests)

**Step 5: Commit**

```bash
git add lib/bookTier.ts __tests__/lib/bookTier.test.ts
git commit -m "feat: add book tier utility functions"
```

---

## Task 2: Add Tier Visuals to BookCard (Library)

**Files:**
- Modify: `components/BookCard.tsx`

**Step 1: Add imports at top of file**

After line 4 (`import { useTheme } from '@/lib/ThemeContext';`), add:

```typescript
import { getBookTier, getTierColorKey, getTierGlow } from '@/lib/bookTier';
```

**Step 2: Calculate tier values in component**

Inside the `BookCard` function, after line 14 (`const styles = createStyles(...)`), add:

```typescript
  const level = book.progression?.level || 1;
  const tier = getBookTier(level);
  const tierColor = colors[getTierColorKey(tier)];
  const glow = getTierGlow(tier);
```

**Step 3: Update Pressable with tier styles**

Replace the Pressable opening tag (line 20) from:

```typescript
    <Pressable style={styles.container} onPress={onPress}>
```

To:

```typescript
    <Pressable
      style={[
        styles.container,
        {
          borderWidth: 1,
          borderColor: tierColor,
          shadowColor: tierColor,
          shadowRadius: glow.shadowRadius,
          shadowOpacity: glow.shadowOpacity,
          shadowOffset: { width: 0, height: 0 },
          elevation: glow.elevation,
        },
      ]}
      onPress={onPress}
    >
```

**Step 4: Verify visually**

Run: `npm start` and open library screen
Expected: Book cards show colored borders (gray for new books, blue/gold for leveled books)

**Step 5: Commit**

```bash
git add components/BookCard.tsx
git commit -m "feat: add tier border and glow to library book cards"
```

---

## Task 3: Add Tier Visuals to Book Detail Page

**Files:**
- Modify: `app/book/[id].tsx`

**Step 1: Add imports at top of file**

After line 17 (`import { generateCompanionsInBackground } from '@/lib/companionBackgroundGenerator';`), add:

```typescript
import { getBookTier, getTierColorKey, getTierGlow } from '@/lib/bookTier';
```

**Step 2: Calculate tier values before render**

Inside `BookDetailScreen`, after line 431 (`const minutes = Math.floor((book.totalReadingTime % 3600) / 60);`), add:

```typescript
  const level = book.progression?.level || 1;
  const tier = getBookTier(level);
  const tierColor = colors[getTierColorKey(tier)];
  const glow = getTierGlow(tier);
```

**Step 3: Update cover section with border/glow**

Replace the cover section (lines 441-449) from:

```typescript
      {/* Book cover */}
      <View style={styles.coverSection}>
        {book.coverUrl ? (
          <Image source={{ uri: book.coverUrl }} style={styles.cover} resizeMode="contain" />
        ) : (
          <View style={[styles.cover, styles.placeholder]}>
            <Text style={styles.placeholderText}>?</Text>
          </View>
        )}
      </View>
```

To:

```typescript
      {/* Book cover */}
      <View style={styles.coverSection}>
        <View
          style={{
            borderWidth: 2,
            borderColor: tierColor,
            shadowColor: tierColor,
            shadowRadius: glow.shadowRadius,
            shadowOpacity: glow.shadowOpacity,
            shadowOffset: { width: 0, height: 0 },
            elevation: glow.elevation,
          }}
        >
          {book.coverUrl ? (
            <Image source={{ uri: book.coverUrl }} style={styles.cover} resizeMode="contain" />
          ) : (
            <View style={[styles.cover, styles.placeholder]}>
              <Text style={styles.placeholderText}>?</Text>
            </View>
          )}
        </View>
      </View>
```

**Step 4: Add level badge below title**

After line 453 (`<Text style={styles.title}>{book.title.toLowerCase()}_</Text>`), add:

```typescript
      <Text style={[styles.levelBadge, { color: tierColor }]}>
        lv.{level} [{tier}]
      </Text>
```

**Step 5: Add levelBadge style to createStyles**

Inside `createStyles`, after the `time` style (around line 703), add:

```typescript
    levelBadge: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
      marginBottom: spacing(2),
    },
```

**Step 6: Verify visually**

Run: `npm start` and navigate to a book detail page
Expected: Cover has colored border with glow, level badge shows below title

**Step 7: Commit**

```bash
git add app/book/[id].tsx
git commit -m "feat: add tier border, glow, and level badge to book detail page"
```

---

## Task 4: Add Tier Border to Timer Page

**Files:**
- Modify: `app/timer/[bookId].tsx`

**Step 1: Add imports at top of file**

After line 26 (`import { shouldUnlockSlot2, shouldUnlockSlot3 } from '@/lib/slotProgress';`), add:

```typescript
import { getBookTier, getTierColorKey } from '@/lib/bookTier';
```

**Step 2: Calculate tier values in render section**

Inside the component, after line 341 (`const hasActiveEffects = displayEffects.length > 0;`), add:

```typescript
  const level = book?.progression?.level || 1;
  const tier = getBookTier(level);
  const tierColor = colors[getTierColorKey(tier)];
```

**Step 3: Wrap cover Image with bordered View**

Replace the cover section (lines 346-348) from:

```typescript
      {/* Book cover (optional) */}
      {book?.coverUrl && (
        <Image source={{ uri: book.coverUrl }} style={styles.cover} resizeMode="contain" />
      )}
```

To:

```typescript
      {/* Book cover (optional) */}
      {book?.coverUrl && (
        <View style={{ borderWidth: 1, borderColor: tierColor }}>
          <Image source={{ uri: book.coverUrl }} style={styles.cover} resizeMode="contain" />
        </View>
      )}
```

**Step 4: Verify visually**

Run: `npm start` and navigate to timer page
Expected: Cover has subtle colored border matching book tier

**Step 5: Commit**

```bash
git add app/timer/[bookId].tsx
git commit -m "feat: add tier border to timer page book cover"
```

---

## Task 5: Add Tier Border to Home Page

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Step 1: Add imports at top of file**

After line 9 (`import { DungeonBar } from '@/components/dungeon';`), add:

```typescript
import { getBookTier, getTierColorKey } from '@/lib/bookTier';
```

**Step 2: Calculate tier values before render**

Inside `HomeScreen`, after line 44 (`const xp = progress ? xpProgress(progress.totalXp) : { current: 0, needed: 1000 };`), add:

```typescript
  const bookLevel = currentBook?.progression?.level || 1;
  const bookTier = getBookTier(bookLevel);
  const bookTierColor = currentBook ? colors[getTierColorKey(bookTier)] : colors.border;
```

**Step 3: Update currentBook Pressable with tier border**

Replace the currentBook Pressable (lines 73-90) from:

```typescript
        <Pressable
          style={[styles.currentBook, currentBook.coverUrl && styles.currentBookWithCover]}
          onPress={() => router.push(`/timer/${currentBook.id}`)}
        >
```

To:

```typescript
        <Pressable
          style={[
            styles.currentBook,
            { borderColor: bookTierColor },
            currentBook.coverUrl && styles.currentBookWithCover,
          ]}
          onPress={() => router.push(`/timer/${currentBook.id}`)}
        >
```

**Step 4: Verify visually**

Run: `npm start` and check home page with a book selected
Expected: "Currently reading" card border color matches book tier

**Step 5: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: add tier border to home page current book card"
```

---

## Task 6: Final Verification and Cleanup

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass including new bookTier tests

**Step 2: Visual verification checklist**

- [ ] Library: Books show colored borders (gray/blue/gold based on level)
- [ ] Library: Higher tier books have visible glow on iOS
- [ ] Book Detail: Cover has colored border with glow
- [ ] Book Detail: Level badge shows "lv.X [tier]" below title
- [ ] Timer: Cover has subtle colored border
- [ ] Home: Current book card border matches tier color

**Step 3: Final commit with all changes**

```bash
git add -A
git commit -m "feat: complete book level tier visual system

- Add bookTier utility with getBookTier, getTierColorKey, getTierGlow
- Library: colored borders + glow on book cards
- Book detail: border + glow on cover, level badge below title
- Timer: subtle border on cover
- Home: tier border on current book card

Tier mapping:
- Common (gray): levels 1-3
- Rare (blue): levels 4-6
- Legendary (gold): level 7+"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `lib/bookTier.ts`, `__tests__/lib/bookTier.test.ts` | Utility functions with tests |
| 2 | `components/BookCard.tsx` | Library card borders + glow |
| 3 | `app/book/[id].tsx` | Detail page border + glow + badge |
| 4 | `app/timer/[bookId].tsx` | Timer page subtle border |
| 5 | `app/(tabs)/index.tsx` | Home page card border |
| 6 | - | Testing and verification |
