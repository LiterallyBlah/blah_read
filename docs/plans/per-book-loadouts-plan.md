# Per-Book Loadouts & Genre System Refinement Plan

> **Goal:** Simplify the companion system by moving loadouts to per-book, removing genre-level equipping restrictions, and making genre-targeted effects more powerful to create meaningful trade-offs.

**Tech Stack:** React Native/Expo, TypeScript, AsyncStorage

---

## Summary of Changes

| Area | Current | New |
|------|---------|-----|
| Loadout storage | Global (`UserProgress.loadout`) | Per-book (`Book.loadout`) |
| Equipping requirements | Book level + Genre level | Book level only |
| Genre-targeted effects | Same power as global | Higher power than global |
| Mismatched effects | No feedback | Highlighted in red/grey |
| Milestones display | Total reading time (profile) | Per-book (book detail) |
| Home screen | Single reading book | Card deck of reading books |

---

## Sprint 1: Data Model & Migration

### Task 1.1: Add Loadout to Book Type

**Files:**
- Modify: `lib/types.ts`

**Changes:**
```typescript
// In Book interface, add:
export interface Book {
  // ... existing fields
  loadout?: CompanionLoadout; // NEW - per-book loadout
}
```

**Note:** Keep `UserProgress.loadout` temporarily for migration, remove later.

---

### Task 1.2: Create Migration for Existing Data

**Files:**
- Modify: `lib/migrations.ts`
- Modify: `lib/storage.ts`

**Migration logic:**
1. Check if `UserProgress.loadout` exists and has companions equipped
2. Find the book with status "reading" (or most recent reading book)
3. Copy the global loadout to that book's loadout
4. Set other books' loadouts to empty slots
5. Mark migration complete

**Migration code:**
```typescript
// In migrations.ts
async function migrateGlobalLoadoutToBooks(
  progress: UserProgress,
  books: Book[]
): Promise<Book[]> {
  if (!progress.loadout) return books;

  const readingBook = books.find(b => b.status === 'reading');

  return books.map(book => ({
    ...book,
    loadout: book.id === readingBook?.id
      ? progress.loadout
      : { slots: [null, null, null], unlockedSlots: progress.loadout.unlockedSlots }
  }));
}
```

---

### Task 1.3: Update Storage Functions

**Files:**
- Modify: `lib/storage.ts`

**Changes:**
- `saveBook()` - Include loadout in book data
- `getBooks()` - Ensure loadout is loaded with book
- Add `updateBookLoadout(bookId, loadout)` helper function
- Default loadout for new books: `{ slots: [null, null, null], unlockedSlots: progress.loadout.unlockedSlots }`

---

### Task 1.4: Update Loadout Utility Functions

**Files:**
- Modify: `lib/loadout.ts`

**Changes:**
- Update `equipCompanion()` to take `bookId` parameter
- Update `unequipCompanion()` to take `bookId` parameter
- Update `getEquippedCompanions()` to take book's loadout, not global
- Remove references to `UserProgress.loadout`

---

## Sprint 2: Remove Genre-Level Equipping Requirements

### Task 2.1: Simplify canEquipCompanion Function

**Files:**
- Modify: `lib/companionEffects.ts`
- Modify: `__tests__/lib/companionEffects.test.ts`

**Current signature:**
```typescript
function canEquipCompanion(
  rarity: CompanionRarity,
  targetGenre: Genre | undefined,
  currentGenreLevel: number,
  currentBookLevel: number
): EquipRequirements
```

**New signature:**
```typescript
function canEquipCompanion(
  rarity: CompanionRarity,
  currentBookLevel: number
): EquipRequirements
```

**Changes:**
- Remove `targetGenre` and `currentGenreLevel` parameters
- Remove `GENRE_LEVEL_REQUIREMENTS` usage for equipping
- Keep `BOOK_LEVEL_REQUIREMENTS` (rare=5, legendary=10)
- Update return type to remove `missingGenreLevel`

**Keep for reference (don't delete):**
- `GENRE_LEVEL_REQUIREMENTS` constant - may be used for future features

---

### Task 2.2: Update Collection Screen Equipping Logic

**Files:**
- Modify: `app/(tabs)/collection.tsx`

**Changes:**
- Remove genre level checks from `handleEquip()`
- Update `CompanionCard` to not show genre level requirements
- Only show book level requirements when companion can't be equipped
- Add "Equip to which book?" flow (see Task 3.2)

---

## Sprint 3: UI Changes for Per-Book Loadouts

### Task 3.1: Add Loadout Display to Book Detail Screen

**Files:**
- Modify: `app/book/[id].tsx`

**Purpose:** Show the book's loadout with equipped companions.

**UI Elements:**
- Section showing 3 loadout slots (1-3 based on unlocked)
- Each slot shows companion image/name or "empty"
- Tap slot → navigate to collection to equip
- Visual indicator for effects that DON'T apply to this book's genres

**Implementation:**
```typescript
// In book detail screen
<View style={styles.loadoutSection}>
  <Text style={styles.sectionHeader}>loadout_</Text>
  <View style={styles.loadoutSlots}>
    {book.loadout?.slots.map((companionId, index) => (
      <LoadoutSlot
        key={index}
        slotIndex={index}
        companionId={companionId}
        bookGenres={book.normalizedGenres}
        locked={index >= (book.loadout?.unlockedSlots || 1)}
        onPress={() => navigateToEquip(book.id, index)}
      />
    ))}
  </View>
</View>
```

---

### Task 3.2: Update Collection Screen for Per-Book Equipping

**Files:**
- Modify: `app/(tabs)/collection.tsx`

**Changes:**
- Accept optional `bookId` and `slotIndex` route params
- When params present: "Equipping to [Book Title] - Slot [X]"
- Filter companions to show only those meeting book level requirement
- On select: equip to that book's loadout, navigate back

**Navigation flow:**
```
Book Detail → Tap Slot → Collection (with bookId, slotIndex) →
Select Companion → Save to Book Loadout → Back to Book Detail
```

---

### Task 3.3: Highlight Mismatched Effects

**Files:**
- Modify: `app/book/[id].tsx`
- Modify: `app/(tabs)/collection.tsx`
- Create: `components/EffectBadge.tsx`

**Purpose:** Show when an effect won't apply to the current book.

**Visual treatment:**
- Matching genre effect: Normal color
- Non-matching genre effect: Grey/red text, strikethrough or dimmed
- Global effect: Always normal (applies to all)

**Example:**
```
Book: "Horror Novel" (genres: [horror, thriller])
Companion effects:
  ✓ +15% XP (Horror) - green, active
  ✗ +12% XP (Fantasy) - red/grey, inactive
  ✓ +10% Luck - normal, global
```

---

### Task 3.4: Remove Loadout from Profile Screen

**Files:**
- Modify: `app/(tabs)/profile.tsx`

**Changes:**
- Remove the loadout section entirely
- Keep genre levels display (still valuable for progression tracking)
- Keep slot progress display (still uses slotProgress data)

---

## Sprint 4: Boost Genre-Targeted Effect Magnitudes

### Task 4.1: Create Separate Magnitude Ranges

**Files:**
- Modify: `lib/companionEffects.ts`
- Modify: `__tests__/lib/companionEffects.test.ts`

**Current:**
```typescript
const EFFECT_MAGNITUDES: Record<CompanionRarity, { min: number; max: number }> = {
  common: { min: 0.03, max: 0.07 },
  rare: { min: 0.12, max: 0.18 },
  legendary: { min: 0.25, max: 0.35 },
};
```

**New:**
```typescript
const GLOBAL_EFFECT_MAGNITUDES: Record<CompanionRarity, { min: number; max: number }> = {
  common: { min: 0.02, max: 0.05 },    // Reduced: 2-5%
  rare: { min: 0.08, max: 0.12 },       // Reduced: 8-12%
  legendary: { min: 0.18, max: 0.25 },  // Reduced: 18-25%
};

const GENRE_TARGETED_MAGNITUDES: Record<CompanionRarity, { min: number; max: number }> = {
  common: { min: 0.05, max: 0.10 },     // Boosted: 5-10%
  rare: { min: 0.15, max: 0.22 },       // Boosted: 15-22%
  legendary: { min: 0.30, max: 0.40 },  // Boosted: 30-40%
};
```

**Trade-off:**
| Rarity | Global | Genre-Targeted | Difference |
|--------|--------|----------------|------------|
| Common | 2-5% | 5-10% | ~2x power |
| Rare | 8-12% | 15-22% | ~1.8x power |
| Legendary | 18-25% | 30-40% | ~1.6x power |

---

### Task 4.2: Update Effect Generation

**Files:**
- Modify: `lib/companionEffects.ts`

**Changes to `rollSingleEffect()`:**
```typescript
export function rollSingleEffect(
  rarity: CompanionRarity,
  bookGenres?: Genre[],
  excludeTypes: EffectType[] = []
): CompanionEffect {
  // ... select effect type

  // Determine if genre-targeted (only for xp_boost)
  let targetGenre: Genre | undefined;
  if (type === 'xp_boost' && bookGenres && bookGenres.length > 0) {
    if (Math.random() < XP_BOOST_GENRE_TARGET_CHANCE) {
      targetGenre = bookGenres[Math.floor(Math.random() * bookGenres.length)];
    }
  }

  // Use appropriate magnitude range based on targeting
  const magnitudeRange = targetGenre
    ? GENRE_TARGETED_MAGNITUDES[rarity]
    : GLOBAL_EFFECT_MAGNITUDES[rarity];

  const magnitude = magnitudeRange.min + Math.random() * (magnitudeRange.max - magnitudeRange.min);

  return { type, magnitude, targetGenre };
}
```

**Note:** This only affects NEW companions. Existing companions keep their current magnitudes.

---

## Sprint 5: Milestones Per-Book Display

### Task 5.1: Move Milestones to Book Detail Screen

**Files:**
- Modify: `app/book/[id].tsx`
- Modify: `components/Milestones.tsx`

**Changes:**
- Add milestones section to book detail screen
- Pass `book.totalReadingTime` (in seconds) to component
- Show milestone progress for THIS book specifically
- Show "next companion unlock at X hours"

---

### Task 5.2: Update or Remove Profile Milestones

**Files:**
- Modify: `app/(tabs)/profile.tsx`

**Options:**
1. Remove milestones from profile entirely (moved to book detail)
2. Keep as "total reading achievements" (rename to clarify it's cumulative)

**Recommendation:** Remove from profile to avoid confusion. Milestones are per-book.

---

## Sprint 6: Home Screen Card Deck

### Task 6.1: Create Reading Book Card Component

**Files:**
- Create: `components/ReadingBookCard.tsx`

**Features:**
- Book cover image
- Title and author
- Current level and tier badge
- Mini loadout preview (3 small companion icons)
- Reading progress indicator
- "Start Reading" button

---

### Task 6.2: Implement Card Deck on Home Screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Changes:**
- Filter books with status "reading"
- Display as horizontal swipeable cards (or vertical stack)
- Swipe to see other reading books
- Tap card → go to book detail (not directly to timer)
- Empty state: "No books currently reading. Visit your library!"

**Implementation options:**
1. Horizontal FlatList with snap-to-center
2. Card stack with swipe gestures
3. Simple vertical list of reading books

**Recommendation:** Start with horizontal FlatList (simpler), can enhance to stack later.

---

### Task 6.3: Update Book Status Flow

**Files:**
- Modify: `app/book/[id].tsx`

**Changes:**
- "Start Reading" button sets status to "reading" (already works)
- No need to auto-pause other books (multiple reading allowed)
- Add "Pause" button to set status back to "to_read" if desired

---

## Sprint 7: Cleanup & Testing

### Task 7.1: Remove Global Loadout from UserProgress

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/storage.ts`
- Modify: `lib/migrations.ts`

**Changes:**
- Remove `loadout` field from `UserProgress` interface
- Keep `slotProgress` for slot unlock tracking
- Ensure migration has run for all users before removing

---

### Task 7.2: Update All Tests

**Files:**
- Modify: `__tests__/lib/companionEffects.test.ts`
- Modify: `__tests__/lib/loadout.test.ts`
- Modify: `__tests__/lib/sessionRewards.test.ts`
- Add: `__tests__/lib/bookLoadout.test.ts`

**Test coverage needed:**
- Per-book loadout CRUD operations
- Effect magnitude differences (global vs genre-targeted)
- Equipping with book-level-only requirements
- Migration from global to per-book loadouts
- Effect application with mismatched genres

---

### Task 7.3: Manual Testing Checklist

- [ ] New user: Books start with empty loadouts
- [ ] Existing user: Global loadout migrated to reading book
- [ ] Equip companion from book detail screen
- [ ] Equip companion from collection with book context
- [ ] Genre-targeted effects highlighted when mismatched
- [ ] Genre-targeted effects have higher magnitudes than global
- [ ] Book level requirements still enforced
- [ ] Genre level requirements NOT enforced (removed)
- [ ] Home screen shows multiple reading books
- [ ] Milestones show per-book progress
- [ ] Slot unlock progress still works

---

## Implementation Order

```
Sprint 1: Data Model & Migration
  1.1 → 1.2 → 1.3 → 1.4

Sprint 2: Remove Genre Requirements
  2.1 → 2.2

Sprint 3: UI for Per-Book Loadouts
  3.1 → 3.2 → 3.3 → 3.4

Sprint 4: Boost Genre-Targeted Effects
  4.1 → 4.2

Sprint 5: Milestones Per-Book
  5.1 → 5.2

Sprint 6: Home Screen Card Deck
  6.1 → 6.2 → 6.3

Sprint 7: Cleanup & Testing
  7.1 → 7.2 → 7.3
```

**Estimated tasks:** 18 tasks across 7 sprints

---

## Files Summary

**New Files:**
- `components/ReadingBookCard.tsx`
- `components/EffectBadge.tsx`
- `__tests__/lib/bookLoadout.test.ts`

**Modified Files:**
- `lib/types.ts` - Add loadout to Book, eventually remove from UserProgress
- `lib/storage.ts` - Book loadout functions
- `lib/migrations.ts` - Global to per-book migration
- `lib/loadout.ts` - Update for per-book context
- `lib/companionEffects.ts` - Remove genre requirements, boost genre magnitudes
- `app/(tabs)/index.tsx` - Card deck home screen
- `app/(tabs)/profile.tsx` - Remove loadout section
- `app/(tabs)/collection.tsx` - Per-book equipping flow
- `app/book/[id].tsx` - Loadout display, milestones
- `components/Milestones.tsx` - Per-book context

---

## Risk Mitigation

1. **Data migration failure**: Keep global loadout field until migration confirmed for all users
2. **Existing companions with old magnitudes**: Don't retroactively change - only new companions get new ranges
3. **Breaking changes**: Feature flag for per-book loadouts during development
4. **Performance**: Lazy load companion images in card deck

---

## Success Criteria

- [ ] Users can manage loadouts per-book without leaving book detail
- [ ] No genre-level requirements blocking companion equipping
- [ ] Genre-targeted effects visibly more powerful than global
- [ ] Clear visual feedback when effects don't apply to current book
- [ ] Multiple reading books accessible from home screen
- [ ] Milestone progress shown per-book, not total
