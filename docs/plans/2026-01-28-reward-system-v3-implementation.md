# Reward System V3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a book-centric progression system with genre tagging, companion effects, loadout slots, consumables, and three-layer loot RNG.

**Architecture:** Extend existing companion/loot infrastructure with new data models for book levels, genres, effects, and consumables. Reading sessions trigger book leveling, which triggers loot rolls. Companions provide passive effects that modify XP gain, luck, and drop rates.

**Tech Stack:** React Native/Expo, TypeScript, AsyncStorage, existing LLM integration for companion generation.

---

## Configuration Constants

These values are used throughout the implementation:

```typescript
// Book Leveling
const SECONDS_PER_LEVEL = 3600; // 1 hour = 1 level
const PAGES_PER_LEVEL = 30; // 30 pages = 1 level (for completion floor)

// Companion Gating
const GENRE_LEVEL_REQUIREMENTS = { common: 0, rare: 10, legendary: 20 };
const BOOK_LEVEL_REQUIREMENTS = { common: 0, rare: 5, legendary: 10 };

// Effect Magnitudes by Rarity
const EFFECT_MAGNITUDES = {
  common: { min: 0.03, max: 0.07 },   // ~5%
  rare: { min: 0.12, max: 0.18 },     // ~15%
  legendary: { min: 0.25, max: 0.35 } // ~30%
};

// Multi-stat Chances
const MULTI_STAT_CHANCE = { common: 0.1, rare: 0.3, legendary: 0.6 };

// Slot Unlock Points
const SLOT_2_POINTS = 100;
const SLOT_3_POINTS = 300;

// Loot Box Tiers
const BOX_TIER_ODDS = { wood: 0.70, silver: 0.25, gold: 0.05 };
```

---

## Phase 1: Data Foundation

### Task 1: Define Genre Types

**Files:**
- Create: `lib/genres.ts`
- Test: `__tests__/lib/genres.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/genres.test.ts
import { GENRES, Genre, isValidGenre } from '../../lib/genres';

describe('genres', () => {
  it('should have exactly 12 genres', () => {
    expect(GENRES.length).toBe(12);
  });

  it('should validate known genres', () => {
    expect(isValidGenre('fantasy')).toBe(true);
    expect(isValidGenre('sci-fi')).toBe(true);
    expect(isValidGenre('invalid-genre')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/genres.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// lib/genres.ts
export const GENRES = [
  'fantasy',
  'sci-fi',
  'mystery-thriller',
  'horror',
  'romance',
  'literary-fiction',
  'history',
  'biography-memoir',
  'science-nature',
  'self-improvement',
  'business-finance',
  'philosophy-religion',
] as const;

export type Genre = typeof GENRES[number];

export function isValidGenre(genre: string): genre is Genre {
  return GENRES.includes(genre as Genre);
}

export const GENRE_DISPLAY_NAMES: Record<Genre, string> = {
  'fantasy': 'Fantasy',
  'sci-fi': 'Sci-Fi',
  'mystery-thriller': 'Mystery & Thriller',
  'horror': 'Horror',
  'romance': 'Romance',
  'literary-fiction': 'Literary Fiction',
  'history': 'History',
  'biography-memoir': 'Biography & Memoir',
  'science-nature': 'Science & Nature',
  'self-improvement': 'Self-Improvement',
  'business-finance': 'Business & Finance',
  'philosophy-religion': 'Philosophy & Religion',
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/genres.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/genres.ts __tests__/lib/genres.test.ts
git commit -m "feat(rewards-v3): add genre type definitions"
```

---

### Task 2: Define Companion Effect Types

**Files:**
- Create: `lib/companionEffects.ts`
- Test: `__tests__/lib/companionEffects.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/companionEffects.test.ts
import {
  CompanionEffect,
  EffectType,
  EFFECT_TYPES,
  calculateEffectMagnitude,
} from '../../lib/companionEffects';
import { CompanionRarity } from '../../lib/types';

describe('companionEffects', () => {
  it('should have 4 effect types', () => {
    expect(EFFECT_TYPES.length).toBe(4);
  });

  it('should calculate magnitude within rarity range', () => {
    const magnitude = calculateEffectMagnitude('common');
    expect(magnitude).toBeGreaterThanOrEqual(0.03);
    expect(magnitude).toBeLessThanOrEqual(0.07);
  });

  it('should calculate higher magnitude for legendary', () => {
    const magnitude = calculateEffectMagnitude('legendary');
    expect(magnitude).toBeGreaterThanOrEqual(0.25);
    expect(magnitude).toBeLessThanOrEqual(0.35);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/companionEffects.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// lib/companionEffects.ts
import { CompanionRarity } from './types';
import { Genre } from './genres';

export const EFFECT_TYPES = [
  'xp_boost',
  'luck_boost',
  'drop_rate_boost',
  'completion_bonus',
] as const;

export type EffectType = typeof EFFECT_TYPES[number];

export interface CompanionEffect {
  type: EffectType;
  magnitude: number; // 0.05 = 5%, 0.30 = 30%
  targetGenre?: Genre; // undefined = global
}

const EFFECT_MAGNITUDES: Record<CompanionRarity, { min: number; max: number }> = {
  common: { min: 0.03, max: 0.07 },
  rare: { min: 0.12, max: 0.18 },
  legendary: { min: 0.25, max: 0.35 },
};

export function calculateEffectMagnitude(rarity: CompanionRarity): number {
  const range = EFFECT_MAGNITUDES[rarity];
  return range.min + Math.random() * (range.max - range.min);
}

// Completion bonus is legendary-only
export function getAvailableEffectTypes(rarity: CompanionRarity): EffectType[] {
  if (rarity === 'legendary') {
    return [...EFFECT_TYPES];
  }
  return EFFECT_TYPES.filter(t => t !== 'completion_bonus');
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/companionEffects.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/companionEffects.ts __tests__/lib/companionEffects.test.ts
git commit -m "feat(rewards-v3): add companion effect types and magnitude calculation"
```

---

### Task 3: Define Consumable Types

**Files:**
- Create: `lib/consumables.ts`
- Test: `__tests__/lib/consumables.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/consumables.test.ts
import {
  ConsumableTier,
  ConsumableDefinition,
  CONSUMABLES,
  getConsumablesByTier,
} from '../../lib/consumables';

describe('consumables', () => {
  it('should have consumables for each tier', () => {
    expect(getConsumablesByTier('weak').length).toBeGreaterThan(0);
    expect(getConsumablesByTier('medium').length).toBeGreaterThan(0);
    expect(getConsumablesByTier('strong').length).toBeGreaterThan(0);
  });

  it('should have valid effect types on all consumables', () => {
    CONSUMABLES.forEach(c => {
      expect(c.effectType).toBeDefined();
      expect(c.magnitude).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/consumables.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// lib/consumables.ts
export type ConsumableTier = 'weak' | 'medium' | 'strong';
export type ConsumableEffectType =
  | 'xp_boost'
  | 'luck_boost'
  | 'drop_rate_boost'
  | 'streak_shield'
  | 'box_upgrade'
  | 'guaranteed_companion'
  | 'instant_level';

export interface ConsumableDefinition {
  id: string;
  name: string;
  description: string;
  tier: ConsumableTier;
  effectType: ConsumableEffectType;
  magnitude: number;
  duration: number; // Number of sessions or uses, 0 = instant
}

export const CONSUMABLES: ConsumableDefinition[] = [
  // Weak (Wood box tier)
  { id: 'weak_xp_1', name: 'Minor XP Scroll', description: '+10% XP next session', tier: 'weak', effectType: 'xp_boost', magnitude: 0.10, duration: 1 },
  { id: 'weak_luck_1', name: 'Lucky Penny', description: '+5% luck next 2 sessions', tier: 'weak', effectType: 'luck_boost', magnitude: 0.05, duration: 2 },
  { id: 'weak_drop_1', name: 'Treasure Map Scrap', description: '+10% drop rate on next level up', tier: 'weak', effectType: 'drop_rate_boost', magnitude: 0.10, duration: 1 },
  { id: 'weak_streak_1', name: 'Calendar Page', description: '1-day streak shield', tier: 'weak', effectType: 'streak_shield', magnitude: 1, duration: 1 },

  // Medium (Silver box tier)
  { id: 'med_xp_1', name: 'XP Scroll', description: '+25% XP next session', tier: 'medium', effectType: 'xp_boost', magnitude: 0.25, duration: 1 },
  { id: 'med_luck_1', name: 'Four-Leaf Clover', description: '+15% luck next 3 sessions', tier: 'medium', effectType: 'luck_boost', magnitude: 0.15, duration: 3 },
  { id: 'med_drop_1', name: 'Treasure Map', description: '+20% drop rate next 2 level ups', tier: 'medium', effectType: 'drop_rate_boost', magnitude: 0.20, duration: 2 },
  { id: 'med_streak_1', name: 'Calendar', description: '3-day streak shield', tier: 'medium', effectType: 'streak_shield', magnitude: 3, duration: 1 },
  { id: 'med_upgrade_1', name: 'Polish Kit', description: 'Upgrade next box tier', tier: 'medium', effectType: 'box_upgrade', magnitude: 1, duration: 1 },

  // Strong (Gold box tier)
  { id: 'strong_xp_1', name: 'Double XP Tome', description: 'Double XP next session', tier: 'strong', effectType: 'xp_boost', magnitude: 1.0, duration: 1 },
  { id: 'strong_xp_2', name: 'XP Blessing', description: '+50% XP for 3 sessions', tier: 'strong', effectType: 'xp_boost', magnitude: 0.50, duration: 3 },
  { id: 'strong_luck_1', name: 'Luck Charm', description: '+30% luck for 5 sessions', tier: 'strong', effectType: 'luck_boost', magnitude: 0.30, duration: 5 },
  { id: 'strong_companion_1', name: 'Companion Summon', description: 'Guaranteed companion on next box', tier: 'strong', effectType: 'guaranteed_companion', magnitude: 1, duration: 1 },
  { id: 'strong_level_1', name: 'Time Warp', description: 'Instant level up on current book', tier: 'strong', effectType: 'instant_level', magnitude: 1, duration: 0 },
];

export function getConsumablesByTier(tier: ConsumableTier): ConsumableDefinition[] {
  return CONSUMABLES.filter(c => c.tier === tier);
}

export function getConsumableById(id: string): ConsumableDefinition | undefined {
  return CONSUMABLES.find(c => c.id === id);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/consumables.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/consumables.ts __tests__/lib/consumables.test.ts
git commit -m "feat(rewards-v3): add consumable definitions"
```

---

### Task 4: Extend Type Definitions

**Files:**
- Modify: `lib/types.ts`

**Step 1: Read current types.ts**

Read the file to understand existing structure.

**Step 2: Add new type definitions**

Add the following types to `lib/types.ts`:

```typescript
// Add imports at top
import { Genre } from './genres';
import { CompanionEffect } from './companionEffects';

// Add to existing Companion interface
export interface Companion {
  // ... existing fields ...
  effects?: CompanionEffect[]; // NEW: companion effects
}

// NEW: Book level tracking (add to Book interface)
export interface BookProgression {
  level: number;
  totalSeconds: number; // Reading time for this book
  levelUps: number[]; // Timestamps of level ups (for loot tracking)
}

// Extend Book interface
export interface Book {
  // ... existing fields ...
  genres?: Genre[]; // NEW: normalized genres
  progression?: BookProgression; // NEW: book-specific progression
}

// NEW: Active consumable effect
export interface ActiveConsumable {
  consumableId: string;
  remainingDuration: number; // Sessions or uses remaining
  appliedAt: number; // Timestamp
}

// NEW: Loadout system
export interface CompanionLoadout {
  slots: (string | null)[]; // Companion IDs, null = empty slot
  unlockedSlots: number; // 1, 2, or 3
}

// NEW: Slot unlock progress
export interface SlotUnlockProgress {
  slot2Points: number;
  slot3Points: number;
  // Track which milestones have been counted
  booksFinished: number;
  hoursLogged: number;
  companionsCollected: number;
  sessionsCompleted: number;
  genreLevelTens: string[]; // Genre IDs that hit level 10
  genresRead: string[]; // Unique genres read
}

// NEW: Genre levels
export type GenreLevels = Record<Genre, number>;

// NEW: Loot box tiers
export type LootBoxTier = 'wood' | 'silver' | 'gold';

// NEW: Enhanced loot box
export interface LootBoxV3 {
  id: string;
  tier: LootBoxTier;
  earnedAt: number;
  source: 'level_up' | 'bonus_drop' | 'completion';
  bookId?: string;
}

// Extend UserProgress
export interface UserProgress {
  // ... existing fields ...
  genreLevels?: GenreLevels; // NEW: per-genre levels
  loadout?: CompanionLoadout; // NEW: equipped companions
  slotProgress?: SlotUnlockProgress; // NEW: slot unlock tracking
  activeConsumables?: ActiveConsumable[]; // NEW: active consumable effects
  lootBoxesV3?: LootBoxV3[]; // NEW: tiered loot boxes
}
```

**Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(rewards-v3): extend type definitions for book levels, genres, effects, consumables"
```

---

### Task 5: Update Storage Defaults

**Files:**
- Modify: `lib/storage.ts`
- Test: `__tests__/lib/storage.test.ts` (if exists, otherwise skip test)

**Step 1: Read current storage.ts**

Read the file to understand existing structure.

**Step 2: Update default progress**

Add defaults for new fields in the `DEFAULT_PROGRESS` object or equivalent:

```typescript
// Add to default user progress
genreLevels: {
  'fantasy': 0,
  'sci-fi': 0,
  'mystery-thriller': 0,
  'horror': 0,
  'romance': 0,
  'literary-fiction': 0,
  'history': 0,
  'biography-memoir': 0,
  'science-nature': 0,
  'self-improvement': 0,
  'business-finance': 0,
  'philosophy-religion': 0,
},
loadout: {
  slots: [null, null, null],
  unlockedSlots: 1,
},
slotProgress: {
  slot2Points: 0,
  slot3Points: 0,
  booksFinished: 0,
  hoursLogged: 0,
  companionsCollected: 0,
  sessionsCompleted: 0,
  genreLevelTens: [],
  genresRead: [],
},
activeConsumables: [],
lootBoxesV3: [],
```

**Step 3: Commit**

```bash
git add lib/storage.ts
git commit -m "feat(rewards-v3): add storage defaults for new progression fields"
```

---

## Phase 2: Genre System

### Task 6: Create Genre Mapping Logic

**Files:**
- Modify: `lib/genres.ts`
- Test: `__tests__/lib/genres.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to __tests__/lib/genres.test.ts
import { mapToCanonicalGenres } from '../../lib/genres';

describe('mapToCanonicalGenres', () => {
  it('should map Google Books categories to canonical genres', () => {
    const categories = ['Fiction / Science Fiction / Space Opera'];
    const genres = mapToCanonicalGenres(categories);
    expect(genres).toContain('sci-fi');
  });

  it('should handle multiple categories', () => {
    const categories = ['Fiction / Fantasy / Epic', 'Fiction / Romance'];
    const genres = mapToCanonicalGenres(categories);
    expect(genres).toContain('fantasy');
    expect(genres).toContain('romance');
  });

  it('should deduplicate genres', () => {
    const categories = ['Fiction / Fantasy', 'Fantasy Fiction'];
    const genres = mapToCanonicalGenres(categories);
    const fantasyCount = genres.filter(g => g === 'fantasy').length;
    expect(fantasyCount).toBe(1);
  });

  it('should return empty array for unmappable categories', () => {
    const categories = ['Completely Unknown Category'];
    const genres = mapToCanonicalGenres(categories);
    expect(genres.length).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/genres.test.ts`
Expected: FAIL with "mapToCanonicalGenres is not a function"

**Step 3: Write minimal implementation**

Add to `lib/genres.ts`:

```typescript
// Keyword mappings for each genre
const GENRE_KEYWORDS: Record<Genre, string[]> = {
  'fantasy': ['fantasy', 'magic', 'wizard', 'dragon', 'mythical'],
  'sci-fi': ['science fiction', 'sci-fi', 'scifi', 'space', 'cyberpunk', 'dystopia', 'futuristic'],
  'mystery-thriller': ['mystery', 'thriller', 'suspense', 'detective', 'crime', 'noir'],
  'horror': ['horror', 'scary', 'supernatural horror', 'gothic'],
  'romance': ['romance', 'love story', 'romantic'],
  'literary-fiction': ['literary fiction', 'literary', 'contemporary fiction', 'general fiction'],
  'history': ['history', 'historical', 'ancient', 'medieval', 'world war'],
  'biography-memoir': ['biography', 'memoir', 'autobiography', 'life story'],
  'science-nature': ['science', 'nature', 'biology', 'physics', 'chemistry', 'environment', 'popular science'],
  'self-improvement': ['self-help', 'self-improvement', 'personal development', 'productivity', 'psychology', 'motivation'],
  'business-finance': ['business', 'finance', 'economics', 'entrepreneurship', 'management', 'investing'],
  'philosophy-religion': ['philosophy', 'religion', 'spirituality', 'ethics', 'theology'],
};

export function mapToCanonicalGenres(categories: string[]): Genre[] {
  const matchedGenres = new Set<Genre>();

  for (const category of categories) {
    const lowerCategory = category.toLowerCase();

    for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
      if (keywords.some(keyword => lowerCategory.includes(keyword))) {
        matchedGenres.add(genre as Genre);
      }
    }
  }

  return Array.from(matchedGenres);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/genres.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/genres.ts __tests__/lib/genres.test.ts
git commit -m "feat(rewards-v3): add Google Books category to genre mapping"
```

---

### Task 7: Integrate Genre Mapping with Book Enrichment

**Files:**
- Modify: `lib/bookEnrichment.ts`
- Test: Manual verification

**Step 1: Read current bookEnrichment.ts**

Read the file to understand current structure.

**Step 2: Add genre mapping**

Update the `enrichBookData` function to include normalized genres:

```typescript
// Add import at top
import { mapToCanonicalGenres, Genre } from './genres';

// Update EnrichmentResult interface
export interface EnrichmentResult {
  // ... existing fields ...
  normalizedGenres: Genre[]; // NEW
}

// In the function, after getting categories from Google Books:
const normalizedGenres = mapToCanonicalGenres(googleResult.categories || []);

// Return normalizedGenres in the result
return {
  // ... existing fields ...
  normalizedGenres,
};
```

**Step 3: Commit**

```bash
git add lib/bookEnrichment.ts
git commit -m "feat(rewards-v3): integrate genre mapping into book enrichment"
```

---

## Phase 3: Book Leveling

### Task 8: Create Book Leveling Logic

**Files:**
- Create: `lib/bookLeveling.ts`
- Test: `__tests__/lib/bookLeveling.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/bookLeveling.test.ts
import {
  calculateBookLevel,
  calculateCompletionBonus,
  calculatePageFloor,
  SECONDS_PER_LEVEL,
  PAGES_PER_LEVEL,
} from '../../lib/bookLeveling';

describe('bookLeveling', () => {
  describe('calculateBookLevel', () => {
    it('should return level 0 for no reading time', () => {
      expect(calculateBookLevel(0)).toBe(0);
    });

    it('should return level 1 after 1 hour', () => {
      expect(calculateBookLevel(3600)).toBe(1);
    });

    it('should return level 5 after 5 hours', () => {
      expect(calculateBookLevel(18000)).toBe(5);
    });

    it('should not count partial hours', () => {
      expect(calculateBookLevel(3599)).toBe(0);
      expect(calculateBookLevel(7199)).toBe(1);
    });
  });

  describe('calculatePageFloor', () => {
    it('should calculate floor based on page count', () => {
      expect(calculatePageFloor(300)).toBe(10); // 300 / 30 = 10
      expect(calculatePageFloor(150)).toBe(5);  // 150 / 30 = 5
    });

    it('should return 0 for null page count', () => {
      expect(calculatePageFloor(null)).toBe(0);
    });
  });

  describe('calculateCompletionBonus', () => {
    it('should award bonus when hourly levels below floor', () => {
      // 4 hours read, 300 pages = floor of 10, bonus of 6
      const bonus = calculateCompletionBonus(14400, 300);
      expect(bonus).toBe(6);
    });

    it('should award 0 bonus when hourly levels exceed floor', () => {
      // 15 hours read, 300 pages = floor of 10, no bonus (15 > 10)
      const bonus = calculateCompletionBonus(54000, 300);
      expect(bonus).toBe(0);
    });

    it('should handle null page count', () => {
      const bonus = calculateCompletionBonus(14400, null);
      expect(bonus).toBe(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/bookLeveling.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// lib/bookLeveling.ts
export const SECONDS_PER_LEVEL = 3600; // 1 hour
export const PAGES_PER_LEVEL = 30;

export function calculateBookLevel(totalSeconds: number): number {
  return Math.floor(totalSeconds / SECONDS_PER_LEVEL);
}

export function calculatePageFloor(pageCount: number | null): number {
  if (pageCount === null || pageCount <= 0) {
    return 0;
  }
  return Math.floor(pageCount / PAGES_PER_LEVEL);
}

export function calculateCompletionBonus(
  totalSeconds: number,
  pageCount: number | null
): number {
  const hourlyLevels = calculateBookLevel(totalSeconds);
  const pageFloor = calculatePageFloor(pageCount);

  if (hourlyLevels >= pageFloor) {
    return 0;
  }

  return pageFloor - hourlyLevels;
}

export interface LevelUpResult {
  previousLevel: number;
  newLevel: number;
  levelsGained: number;
}

export function processReadingTime(
  previousTotalSeconds: number,
  sessionSeconds: number
): LevelUpResult {
  const previousLevel = calculateBookLevel(previousTotalSeconds);
  const newTotalSeconds = previousTotalSeconds + sessionSeconds;
  const newLevel = calculateBookLevel(newTotalSeconds);
  const levelsGained = newLevel - previousLevel;

  return {
    previousLevel,
    newLevel,
    levelsGained,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/bookLeveling.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/bookLeveling.ts __tests__/lib/bookLeveling.test.ts
git commit -m "feat(rewards-v3): add book leveling calculation logic"
```

---

## Phase 4: Companion Effects System

### Task 9: Create Effect Calculation Logic

**Files:**
- Modify: `lib/companionEffects.ts`
- Test: `__tests__/lib/companionEffects.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to __tests__/lib/companionEffects.test.ts
import {
  calculateActiveEffects,
  ActiveEffects,
  CompanionEffect,
} from '../../lib/companionEffects';
import { Companion } from '../../lib/types';

describe('calculateActiveEffects', () => {
  const mockCompanion = (effects: CompanionEffect[]): Companion => ({
    id: 'test',
    name: 'Test Companion',
    description: 'Test',
    rarity: 'common',
    type: 'character',
    source: 'discovered',
    unlockMethod: 'reading_time',
    effects,
  });

  it('should sum XP boost effects', () => {
    const companions = [
      mockCompanion([{ type: 'xp_boost', magnitude: 0.10 }]),
      mockCompanion([{ type: 'xp_boost', magnitude: 0.15 }]),
    ];
    const effects = calculateActiveEffects(companions, ['fantasy']);
    expect(effects.xpBoost).toBeCloseTo(0.25);
  });

  it('should only apply genre-targeted effects when genre matches', () => {
    const companions = [
      mockCompanion([{ type: 'xp_boost', magnitude: 0.20, targetGenre: 'fantasy' }]),
    ];
    const effectsMatch = calculateActiveEffects(companions, ['fantasy']);
    expect(effectsMatch.xpBoost).toBeCloseTo(0.20);

    const effectsNoMatch = calculateActiveEffects(companions, ['sci-fi']);
    expect(effectsNoMatch.xpBoost).toBeCloseTo(0);
  });

  it('should sum all effect types', () => {
    const companions = [
      mockCompanion([
        { type: 'xp_boost', magnitude: 0.10 },
        { type: 'luck_boost', magnitude: 0.05 },
      ]),
    ];
    const effects = calculateActiveEffects(companions, ['fantasy']);
    expect(effects.xpBoost).toBeCloseTo(0.10);
    expect(effects.luckBoost).toBeCloseTo(0.05);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/companionEffects.test.ts`
Expected: FAIL with "calculateActiveEffects is not a function"

**Step 3: Write minimal implementation**

Add to `lib/companionEffects.ts`:

```typescript
import { Companion } from './types';
import { Genre } from './genres';

export interface ActiveEffects {
  xpBoost: number;
  luckBoost: number;
  dropRateBoost: number;
  completionBonus: number;
}

export function calculateActiveEffects(
  equippedCompanions: Companion[],
  bookGenres: Genre[]
): ActiveEffects {
  const effects: ActiveEffects = {
    xpBoost: 0,
    luckBoost: 0,
    dropRateBoost: 0,
    completionBonus: 0,
  };

  for (const companion of equippedCompanions) {
    if (!companion.effects) continue;

    for (const effect of companion.effects) {
      // Check if effect applies (global or matching genre)
      const applies =
        !effect.targetGenre || bookGenres.includes(effect.targetGenre);

      if (!applies) continue;

      switch (effect.type) {
        case 'xp_boost':
          effects.xpBoost += effect.magnitude;
          break;
        case 'luck_boost':
          effects.luckBoost += effect.magnitude;
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

Run: `npm test -- __tests__/lib/companionEffects.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/companionEffects.ts __tests__/lib/companionEffects.test.ts
git commit -m "feat(rewards-v3): add active effect calculation with genre targeting"
```

---

### Task 10: Add Companion Gating Logic

**Files:**
- Modify: `lib/companionEffects.ts`
- Test: `__tests__/lib/companionEffects.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to __tests__/lib/companionEffects.test.ts
import { canEquipCompanion, EquipRequirements } from '../../lib/companionEffects';

describe('canEquipCompanion', () => {
  it('should allow common companions with no requirements', () => {
    const result = canEquipCompanion('common', 'fantasy', 0, 0);
    expect(result.canEquip).toBe(true);
  });

  it('should require genre level 10 and book level 5 for rare', () => {
    const result1 = canEquipCompanion('rare', 'fantasy', 9, 5);
    expect(result1.canEquip).toBe(false);
    expect(result1.missingGenreLevel).toBe(1);

    const result2 = canEquipCompanion('rare', 'fantasy', 10, 4);
    expect(result2.canEquip).toBe(false);
    expect(result2.missingBookLevel).toBe(1);

    const result3 = canEquipCompanion('rare', 'fantasy', 10, 5);
    expect(result3.canEquip).toBe(true);
  });

  it('should require genre level 20 and book level 10 for legendary', () => {
    const result = canEquipCompanion('legendary', 'fantasy', 20, 10);
    expect(result.canEquip).toBe(true);

    const result2 = canEquipCompanion('legendary', 'fantasy', 19, 10);
    expect(result2.canEquip).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/companionEffects.test.ts`
Expected: FAIL with "canEquipCompanion is not a function"

**Step 3: Write minimal implementation**

Add to `lib/companionEffects.ts`:

```typescript
import { CompanionRarity } from './types';

const GENRE_LEVEL_REQUIREMENTS: Record<CompanionRarity, number> = {
  common: 0,
  rare: 10,
  legendary: 20,
};

const BOOK_LEVEL_REQUIREMENTS: Record<CompanionRarity, number> = {
  common: 0,
  rare: 5,
  legendary: 10,
};

export interface EquipRequirements {
  canEquip: boolean;
  missingGenreLevel?: number;
  missingBookLevel?: number;
  requiredGenreLevel: number;
  requiredBookLevel: number;
}

export function canEquipCompanion(
  rarity: CompanionRarity,
  targetGenre: Genre | undefined,
  currentGenreLevel: number,
  currentBookLevel: number
): EquipRequirements {
  const requiredGenreLevel = GENRE_LEVEL_REQUIREMENTS[rarity];
  const requiredBookLevel = BOOK_LEVEL_REQUIREMENTS[rarity];

  // For global companions (no target genre), only check book level
  const genreMet = !targetGenre || currentGenreLevel >= requiredGenreLevel;
  const bookMet = currentBookLevel >= requiredBookLevel;

  return {
    canEquip: genreMet && bookMet,
    missingGenreLevel: genreMet ? undefined : requiredGenreLevel - currentGenreLevel,
    missingBookLevel: bookMet ? undefined : requiredBookLevel - currentBookLevel,
    requiredGenreLevel,
    requiredBookLevel,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/companionEffects.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/companionEffects.ts __tests__/lib/companionEffects.test.ts
git commit -m "feat(rewards-v3): add companion gating by genre and book level"
```

---

## Phase 5: Loadout System

### Task 11: Create Loadout Management

**Files:**
- Create: `lib/loadout.ts`
- Test: `__tests__/lib/loadout.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/loadout.test.ts
import {
  createDefaultLoadout,
  equipCompanion,
  unequipCompanion,
  getEquippedCompanions,
} from '../../lib/loadout';
import { CompanionLoadout } from '../../lib/types';

describe('loadout', () => {
  describe('createDefaultLoadout', () => {
    it('should create loadout with 1 unlocked slot', () => {
      const loadout = createDefaultLoadout();
      expect(loadout.unlockedSlots).toBe(1);
      expect(loadout.slots).toEqual([null, null, null]);
    });
  });

  describe('equipCompanion', () => {
    it('should equip companion to unlocked slot', () => {
      const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 2 };
      const result = equipCompanion(loadout, 'companion-1', 0);
      expect(result.slots[0]).toBe('companion-1');
    });

    it('should fail to equip to locked slot', () => {
      const loadout: CompanionLoadout = { slots: [null, null, null], unlockedSlots: 1 };
      expect(() => equipCompanion(loadout, 'companion-1', 1)).toThrow();
    });

    it('should replace existing companion', () => {
      const loadout: CompanionLoadout = { slots: ['old-companion', null, null], unlockedSlots: 1 };
      const result = equipCompanion(loadout, 'new-companion', 0);
      expect(result.slots[0]).toBe('new-companion');
    });
  });

  describe('unequipCompanion', () => {
    it('should remove companion from slot', () => {
      const loadout: CompanionLoadout = { slots: ['companion-1', null, null], unlockedSlots: 1 };
      const result = unequipCompanion(loadout, 0);
      expect(result.slots[0]).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/loadout.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// lib/loadout.ts
import { CompanionLoadout, Companion } from './types';

export function createDefaultLoadout(): CompanionLoadout {
  return {
    slots: [null, null, null],
    unlockedSlots: 1,
  };
}

export function equipCompanion(
  loadout: CompanionLoadout,
  companionId: string,
  slotIndex: number
): CompanionLoadout {
  if (slotIndex < 0 || slotIndex >= 3) {
    throw new Error(`Invalid slot index: ${slotIndex}`);
  }

  if (slotIndex >= loadout.unlockedSlots) {
    throw new Error(`Slot ${slotIndex + 1} is locked`);
  }

  const newSlots = [...loadout.slots];
  newSlots[slotIndex] = companionId;

  return {
    ...loadout,
    slots: newSlots as [string | null, string | null, string | null],
  };
}

export function unequipCompanion(
  loadout: CompanionLoadout,
  slotIndex: number
): CompanionLoadout {
  if (slotIndex < 0 || slotIndex >= 3) {
    throw new Error(`Invalid slot index: ${slotIndex}`);
  }

  const newSlots = [...loadout.slots];
  newSlots[slotIndex] = null;

  return {
    ...loadout,
    slots: newSlots as [string | null, string | null, string | null],
  };
}

export function getEquippedCompanionIds(loadout: CompanionLoadout): string[] {
  return loadout.slots.filter((id): id is string => id !== null);
}

export function isSlotUnlocked(loadout: CompanionLoadout, slotIndex: number): boolean {
  return slotIndex < loadout.unlockedSlots;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/loadout.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/loadout.ts __tests__/lib/loadout.test.ts
git commit -m "feat(rewards-v3): add loadout management functions"
```

---

### Task 12: Create Slot Unlock Progress Tracking

**Files:**
- Create: `lib/slotProgress.ts`
- Test: `__tests__/lib/slotProgress.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/slotProgress.test.ts
import {
  createDefaultSlotProgress,
  calculateSlot2Progress,
  calculateSlot3Progress,
  SLOT_2_POINTS,
  SLOT_3_POINTS,
} from '../../lib/slotProgress';
import { SlotUnlockProgress } from '../../lib/types';

describe('slotProgress', () => {
  describe('calculateSlot2Progress', () => {
    it('should award 50 points for first book finished', () => {
      const progress = createDefaultSlotProgress();
      const points = calculateSlot2Progress({ ...progress, booksFinished: 1 });
      expect(points).toBe(50);
    });

    it('should award 15 points per hour logged', () => {
      const progress = createDefaultSlotProgress();
      const points = calculateSlot2Progress({ ...progress, hoursLogged: 2 });
      expect(points).toBe(30);
    });

    it('should sum all milestone points', () => {
      const progress: SlotUnlockProgress = {
        ...createDefaultSlotProgress(),
        booksFinished: 1,    // 50
        hoursLogged: 2,      // 30
        companionsCollected: 2, // 40
        sessionsCompleted: 1, // 10
      };
      const points = calculateSlot2Progress(progress);
      expect(points).toBe(130);
    });
  });

  describe('calculateSlot3Progress', () => {
    it('should use different point values', () => {
      const progress: SlotUnlockProgress = {
        ...createDefaultSlotProgress(),
        booksFinished: 1,    // 40 for slot 3
        hoursLogged: 1,      // 10 for slot 3
      };
      const points = calculateSlot3Progress(progress);
      expect(points).toBe(50);
    });

    it('should award 50 points for reaching genre level 10', () => {
      const progress: SlotUnlockProgress = {
        ...createDefaultSlotProgress(),
        genreLevelTens: ['fantasy'],
      };
      const points = calculateSlot3Progress(progress);
      expect(points).toBe(50);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/slotProgress.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// lib/slotProgress.ts
import { SlotUnlockProgress } from './types';

export const SLOT_2_POINTS = 100;
export const SLOT_3_POINTS = 300;

// Slot 2 point values
const SLOT_2_BOOK_FINISHED = 50;
const SLOT_2_HOUR_LOGGED = 15;
const SLOT_2_COMPANION_COLLECTED = 20;
const SLOT_2_SESSION_COMPLETED = 10;

// Slot 3 point values
const SLOT_3_BOOK_FINISHED = 40;
const SLOT_3_HOUR_LOGGED = 10;
const SLOT_3_COMPANION_COLLECTED = 15;
const SLOT_3_GENRE_LEVEL_TEN = 50;
const SLOT_3_NEW_GENRE = 30;

export function createDefaultSlotProgress(): SlotUnlockProgress {
  return {
    slot2Points: 0,
    slot3Points: 0,
    booksFinished: 0,
    hoursLogged: 0,
    companionsCollected: 0,
    sessionsCompleted: 0,
    genreLevelTens: [],
    genresRead: [],
  };
}

export function calculateSlot2Progress(progress: SlotUnlockProgress): number {
  return (
    Math.min(progress.booksFinished, 1) * SLOT_2_BOOK_FINISHED + // Only first book counts
    progress.hoursLogged * SLOT_2_HOUR_LOGGED +
    progress.companionsCollected * SLOT_2_COMPANION_COLLECTED +
    progress.sessionsCompleted * SLOT_2_SESSION_COMPLETED
  );
}

export function calculateSlot3Progress(progress: SlotUnlockProgress): number {
  return (
    progress.booksFinished * SLOT_3_BOOK_FINISHED +
    progress.hoursLogged * SLOT_3_HOUR_LOGGED +
    progress.companionsCollected * SLOT_3_COMPANION_COLLECTED +
    progress.genreLevelTens.length * SLOT_3_GENRE_LEVEL_TEN +
    progress.genresRead.length * SLOT_3_NEW_GENRE
  );
}

export function shouldUnlockSlot2(progress: SlotUnlockProgress): boolean {
  return calculateSlot2Progress(progress) >= SLOT_2_POINTS;
}

export function shouldUnlockSlot3(progress: SlotUnlockProgress): boolean {
  return calculateSlot3Progress(progress) >= SLOT_3_POINTS;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/slotProgress.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/slotProgress.ts __tests__/lib/slotProgress.test.ts
git commit -m "feat(rewards-v3): add slot unlock progress calculation"
```

---

## Phase 6: Loot System V3

### Task 13: Create Three-Layer Loot RNG

**Files:**
- Create: `lib/lootV3.ts`
- Test: `__tests__/lib/lootV3.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/lootV3.test.ts
import {
  rollBoxTier,
  rollCategory,
  rollConsumableTier,
  rollCompanionRarity,
  LootBoxTier,
} from '../../lib/lootV3';

describe('lootV3', () => {
  describe('rollBoxTier', () => {
    it('should return valid tier', () => {
      const tier = rollBoxTier(0);
      expect(['wood', 'silver', 'gold']).toContain(tier);
    });

    it('should bias toward better tiers with luck boost', () => {
      // Run many trials to verify luck affects distribution
      const trials = 1000;
      let goldCount0 = 0;
      let goldCount50 = 0;

      for (let i = 0; i < trials; i++) {
        if (rollBoxTier(0) === 'gold') goldCount0++;
        if (rollBoxTier(0.50) === 'gold') goldCount50++;
      }

      // With 50% luck boost, gold should be more common
      expect(goldCount50).toBeGreaterThan(goldCount0);
    });
  });

  describe('rollCategory', () => {
    it('should return consumable or companion', () => {
      const category = rollCategory('wood');
      expect(['consumable', 'companion']).toContain(category);
    });

    it('should favor companions more in gold boxes', () => {
      const trials = 1000;
      let companionWood = 0;
      let companionGold = 0;

      for (let i = 0; i < trials; i++) {
        if (rollCategory('wood') === 'companion') companionWood++;
        if (rollCategory('gold') === 'companion') companionGold++;
      }

      expect(companionGold / trials).toBeGreaterThan(companionWood / trials);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/lootV3.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// lib/lootV3.ts
import { LootBoxTier, CompanionRarity } from './types';
import { ConsumableTier, ConsumableDefinition, getConsumablesByTier } from './consumables';

// Layer 1: Box tier odds (base)
const BOX_TIER_ODDS = {
  wood: 0.70,
  silver: 0.25,
  gold: 0.05,
};

// Layer 2: Category odds by box tier
const CATEGORY_ODDS: Record<LootBoxTier, { consumable: number; companion: number }> = {
  wood: { consumable: 0.90, companion: 0.10 },
  silver: { consumable: 0.60, companion: 0.40 },
  gold: { consumable: 0.25, companion: 0.75 },
};

// Layer 3a: Consumable tier odds by box tier
const CONSUMABLE_TIER_ODDS: Record<LootBoxTier, Record<ConsumableTier, number>> = {
  wood: { weak: 0.80, medium: 0.20, strong: 0 },
  silver: { weak: 0.30, medium: 0.60, strong: 0.10 },
  gold: { weak: 0, medium: 0.40, strong: 0.60 },
};

// Layer 3b: Companion rarity odds by box tier
const COMPANION_RARITY_ODDS: Record<LootBoxTier, Record<CompanionRarity, number>> = {
  wood: { common: 1.0, rare: 0, legendary: 0 },
  silver: { common: 0.60, rare: 0.40, legendary: 0 },
  gold: { common: 0.10, rare: 0.60, legendary: 0.30 },
};

function weightedRandom<T extends string>(odds: Record<T, number>): T {
  const roll = Math.random();
  let cumulative = 0;

  for (const [key, weight] of Object.entries(odds) as [T, number][]) {
    cumulative += weight;
    if (roll < cumulative) {
      return key;
    }
  }

  // Fallback to first key (shouldn't happen with valid odds)
  return Object.keys(odds)[0] as T;
}

export function rollBoxTier(luckBoost: number = 0): LootBoxTier {
  // Luck boost shifts probability from wood to silver/gold
  const adjustedOdds = {
    wood: Math.max(0, BOX_TIER_ODDS.wood - luckBoost * 0.5),
    silver: BOX_TIER_ODDS.silver + luckBoost * 0.3,
    gold: BOX_TIER_ODDS.gold + luckBoost * 0.2,
  };

  // Normalize
  const total = adjustedOdds.wood + adjustedOdds.silver + adjustedOdds.gold;
  return weightedRandom({
    wood: adjustedOdds.wood / total,
    silver: adjustedOdds.silver / total,
    gold: adjustedOdds.gold / total,
  });
}

export function rollCategory(boxTier: LootBoxTier): 'consumable' | 'companion' {
  const odds = CATEGORY_ODDS[boxTier];
  return Math.random() < odds.consumable ? 'consumable' : 'companion';
}

export function rollConsumableTier(boxTier: LootBoxTier): ConsumableTier {
  return weightedRandom(CONSUMABLE_TIER_ODDS[boxTier]);
}

export function rollCompanionRarity(boxTier: LootBoxTier): CompanionRarity {
  return weightedRandom(COMPANION_RARITY_ODDS[boxTier]);
}

export function rollConsumable(boxTier: LootBoxTier): ConsumableDefinition {
  const tier = rollConsumableTier(boxTier);
  const consumables = getConsumablesByTier(tier);
  return consumables[Math.floor(Math.random() * consumables.length)];
}

export interface LootResult {
  boxTier: LootBoxTier;
  category: 'consumable' | 'companion';
  consumable?: ConsumableDefinition;
  companionRarity?: CompanionRarity;
}

export function rollLoot(luckBoost: number = 0): LootResult {
  const boxTier = rollBoxTier(luckBoost);
  const category = rollCategory(boxTier);

  if (category === 'consumable') {
    return {
      boxTier,
      category,
      consumable: rollConsumable(boxTier),
    };
  } else {
    return {
      boxTier,
      category,
      companionRarity: rollCompanionRarity(boxTier),
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/lootV3.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/lootV3.ts __tests__/lib/lootV3.test.ts
git commit -m "feat(rewards-v3): add three-layer loot RNG system"
```

---

### Task 14: Create Drop Rate Bonus Roll

**Files:**
- Modify: `lib/lootV3.ts`
- Test: `__tests__/lib/lootV3.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to __tests__/lib/lootV3.test.ts
import { rollBonusDrop } from '../../lib/lootV3';

describe('rollBonusDrop', () => {
  it('should return false with 0 drop rate', () => {
    // With 0 drop rate, never get bonus
    let gotBonus = false;
    for (let i = 0; i < 100; i++) {
      if (rollBonusDrop(0)) gotBonus = true;
    }
    expect(gotBonus).toBe(false);
  });

  it('should sometimes return true with positive drop rate', () => {
    // With 50% drop rate, should get some bonuses
    let bonusCount = 0;
    for (let i = 0; i < 100; i++) {
      if (rollBonusDrop(0.50)) bonusCount++;
    }
    expect(bonusCount).toBeGreaterThan(0);
    expect(bonusCount).toBeLessThan(100);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/lootV3.test.ts`
Expected: FAIL with "rollBonusDrop is not a function"

**Step 3: Write minimal implementation**

Add to `lib/lootV3.ts`:

```typescript
export function rollBonusDrop(dropRateBoost: number): boolean {
  if (dropRateBoost <= 0) return false;
  return Math.random() < dropRateBoost;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/lootV3.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/lootV3.ts __tests__/lib/lootV3.test.ts
git commit -m "feat(rewards-v3): add bonus drop rate roll"
```

---

## Phase 7: Consumable System

### Task 15: Create Consumable Effect Application

**Files:**
- Create: `lib/consumableManager.ts`
- Test: `__tests__/lib/consumableManager.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/consumableManager.test.ts
import {
  addActiveConsumable,
  getActiveEffects,
  tickConsumables,
  applyConsumableEffects,
} from '../../lib/consumableManager';
import { ActiveConsumable } from '../../lib/types';
import { CONSUMABLES } from '../../lib/consumables';

describe('consumableManager', () => {
  describe('addActiveConsumable', () => {
    it('should add new consumable to active list', () => {
      const active: ActiveConsumable[] = [];
      const consumable = CONSUMABLES.find(c => c.id === 'weak_xp_1')!;
      const result = addActiveConsumable(active, consumable);
      expect(result.length).toBe(1);
      expect(result[0].consumableId).toBe('weak_xp_1');
      expect(result[0].remainingDuration).toBe(1);
    });

    it('should stack same consumables additively', () => {
      const consumable = CONSUMABLES.find(c => c.id === 'weak_xp_1')!;
      let active = addActiveConsumable([], consumable);
      active = addActiveConsumable(active, consumable);
      // Should have 2 separate entries (stacking)
      expect(active.length).toBe(2);
    });
  });

  describe('getActiveEffects', () => {
    it('should sum effects from active consumables', () => {
      const active: ActiveConsumable[] = [
        { consumableId: 'weak_xp_1', remainingDuration: 1, appliedAt: Date.now() },
        { consumableId: 'med_xp_1', remainingDuration: 1, appliedAt: Date.now() },
      ];
      const effects = getActiveEffects(active);
      expect(effects.xpBoost).toBeCloseTo(0.35); // 0.10 + 0.25
    });
  });

  describe('tickConsumables', () => {
    it('should decrement duration and remove expired', () => {
      const active: ActiveConsumable[] = [
        { consumableId: 'weak_xp_1', remainingDuration: 1, appliedAt: Date.now() },
        { consumableId: 'med_xp_1', remainingDuration: 2, appliedAt: Date.now() },
      ];
      const result = tickConsumables(active);
      expect(result.length).toBe(1);
      expect(result[0].consumableId).toBe('med_xp_1');
      expect(result[0].remainingDuration).toBe(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/consumableManager.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// lib/consumableManager.ts
import { ActiveConsumable } from './types';
import { ConsumableDefinition, getConsumableById } from './consumables';

export interface ConsumableEffects {
  xpBoost: number;
  luckBoost: number;
  dropRateBoost: number;
  streakShieldDays: number;
  boxUpgrade: boolean;
  guaranteedCompanion: boolean;
}

export function addActiveConsumable(
  active: ActiveConsumable[],
  consumable: ConsumableDefinition
): ActiveConsumable[] {
  // Instant effects (duration 0) don't get added to active list
  if (consumable.duration === 0) {
    return active;
  }

  return [
    ...active,
    {
      consumableId: consumable.id,
      remainingDuration: consumable.duration,
      appliedAt: Date.now(),
    },
  ];
}

export function getActiveEffects(active: ActiveConsumable[]): ConsumableEffects {
  const effects: ConsumableEffects = {
    xpBoost: 0,
    luckBoost: 0,
    dropRateBoost: 0,
    streakShieldDays: 0,
    boxUpgrade: false,
    guaranteedCompanion: false,
  };

  for (const ac of active) {
    const consumable = getConsumableById(ac.consumableId);
    if (!consumable) continue;

    switch (consumable.effectType) {
      case 'xp_boost':
        effects.xpBoost += consumable.magnitude;
        break;
      case 'luck_boost':
        effects.luckBoost += consumable.magnitude;
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

export function tickConsumables(active: ActiveConsumable[]): ActiveConsumable[] {
  return active
    .map(ac => ({
      ...ac,
      remainingDuration: ac.remainingDuration - 1,
    }))
    .filter(ac => ac.remainingDuration > 0);
}

export function removeUsedConsumable(
  active: ActiveConsumable[],
  effectType: string
): ActiveConsumable[] {
  // Find and remove one consumable of this effect type
  const index = active.findIndex(ac => {
    const consumable = getConsumableById(ac.consumableId);
    return consumable?.effectType === effectType;
  });

  if (index === -1) return active;

  const newActive = [...active];
  newActive.splice(index, 1);
  return newActive;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/consumableManager.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/consumableManager.ts __tests__/lib/consumableManager.test.ts
git commit -m "feat(rewards-v3): add consumable effect management"
```

---

## Phase 8: Integration - Session Flow

### Task 16: Create Session Reward Processor

**Files:**
- Create: `lib/sessionRewards.ts`
- Test: `__tests__/lib/sessionRewards.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/sessionRewards.test.ts
import {
  processSessionEnd,
  SessionRewardResult,
} from '../../lib/sessionRewards';
import { Book, UserProgress, Companion } from '../../lib/types';

describe('sessionRewards', () => {
  const mockBook: Book = {
    id: 'book-1',
    title: 'Test Book',
    author: 'Test Author',
    status: 'reading',
    genres: ['fantasy'],
    progression: { level: 0, totalSeconds: 0, levelUps: [] },
    pageCount: 300,
  };

  const mockProgress: UserProgress = {
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
    genreLevels: { fantasy: 0 },
    loadout: { slots: [null, null, null], unlockedSlots: 1 },
    slotProgress: {
      slot2Points: 0,
      slot3Points: 0,
      booksFinished: 0,
      hoursLogged: 0,
      companionsCollected: 0,
      sessionsCompleted: 0,
      genreLevelTens: [],
      genresRead: [],
    },
    activeConsumables: [],
    lootBoxesV3: [],
  };

  it('should process reading session and award levels', () => {
    const result = processSessionEnd(
      mockBook,
      mockProgress,
      [], // equipped companions
      3600 // 1 hour = 1 level
    );

    expect(result.bookLevelsGained).toBe(1);
    expect(result.lootBoxes.length).toBe(1); // 1 level = 1 loot box
  });

  it('should apply XP boost from companions', () => {
    const companion: Companion = {
      id: 'c1',
      name: 'Test',
      description: 'Test',
      rarity: 'rare',
      type: 'character',
      source: 'discovered',
      unlockMethod: 'reading_time',
      effects: [{ type: 'xp_boost', magnitude: 0.20, targetGenre: 'fantasy' }],
    };

    const result = processSessionEnd(
      mockBook,
      mockProgress,
      [companion],
      3600
    );

    // Base XP + 20% boost
    expect(result.xpGained).toBeGreaterThan(600); // More than base 10 XP/min * 60 min
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/sessionRewards.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// lib/sessionRewards.ts
import { Book, UserProgress, Companion, LootBoxV3, LootBoxTier } from './types';
import { Genre } from './genres';
import { processReadingTime, calculateCompletionBonus } from './bookLeveling';
import { calculateActiveEffects, ActiveEffects } from './companionEffects';
import { getActiveEffects as getConsumableEffects, tickConsumables } from './consumableManager';
import { rollBoxTier, rollBonusDrop, rollLoot, LootResult } from './lootV3';

export interface SessionRewardResult {
  // Book progression
  bookLevelsGained: number;
  newBookLevel: number;

  // XP
  xpGained: number;

  // Genre levels
  genreLevelIncreases: Record<Genre, number>;

  // Loot
  lootBoxes: LootBoxV3[];
  bonusDropTriggered: boolean;

  // Effects used
  activeEffects: ActiveEffects;

  // Updated state (for saving)
  updatedBook: Book;
  updatedProgress: UserProgress;
}

const BASE_XP_PER_MINUTE = 10;

export function processSessionEnd(
  book: Book,
  progress: UserProgress,
  equippedCompanions: Companion[],
  sessionSeconds: number,
  isCompletion: boolean = false
): SessionRewardResult {
  const bookGenres = (book.genres || []) as Genre[];

  // Calculate active effects from companions
  const companionEffects = calculateActiveEffects(equippedCompanions, bookGenres);

  // Calculate active effects from consumables
  const consumableEffects = getConsumableEffects(progress.activeConsumables || []);

  // Combined effects
  const totalXpBoost = companionEffects.xpBoost + consumableEffects.xpBoost;
  const totalLuckBoost = companionEffects.luckBoost + consumableEffects.luckBoost;
  const totalDropRateBoost = companionEffects.dropRateBoost + consumableEffects.dropRateBoost;

  // Book leveling
  const previousSeconds = book.progression?.totalSeconds || 0;
  const levelResult = processReadingTime(previousSeconds, sessionSeconds);

  // Completion bonus
  let completionBonusLevels = 0;
  if (isCompletion) {
    completionBonusLevels = calculateCompletionBonus(
      previousSeconds + sessionSeconds,
      book.pageCount || null
    );
    // Apply companion completion bonus
    completionBonusLevels = Math.floor(
      completionBonusLevels * (1 + companionEffects.completionBonus)
    );
  }

  const totalLevelsGained = levelResult.levelsGained + completionBonusLevels;

  // XP calculation
  const sessionMinutes = sessionSeconds / 60;
  const baseXp = sessionMinutes * BASE_XP_PER_MINUTE;
  const xpGained = Math.floor(baseXp * (1 + totalXpBoost));

  // Genre level increases (1 per book level gained)
  const genreLevelIncreases: Record<string, number> = {};
  for (const genre of bookGenres) {
    genreLevelIncreases[genre] = totalLevelsGained;
  }

  // Loot boxes (1 per level gained)
  const lootBoxes: LootBoxV3[] = [];
  for (let i = 0; i < totalLevelsGained; i++) {
    const tier = rollBoxTier(totalLuckBoost);
    lootBoxes.push({
      id: `${Date.now()}-${i}`,
      tier,
      earnedAt: Date.now(),
      source: 'level_up',
      bookId: book.id,
    });
  }

  // Bonus drop check (at session end)
  const bonusDropTriggered = rollBonusDrop(totalDropRateBoost);
  if (bonusDropTriggered) {
    const tier = rollBoxTier(totalLuckBoost);
    lootBoxes.push({
      id: `${Date.now()}-bonus`,
      tier,
      earnedAt: Date.now(),
      source: 'bonus_drop',
      bookId: book.id,
    });
  }

  // Update book progression
  const updatedBook: Book = {
    ...book,
    progression: {
      level: levelResult.newLevel + completionBonusLevels,
      totalSeconds: previousSeconds + sessionSeconds,
      levelUps: [
        ...(book.progression?.levelUps || []),
        ...Array(totalLevelsGained).fill(Date.now()),
      ],
    },
  };

  // Update user progress
  const updatedGenreLevels = { ...(progress.genreLevels || {}) };
  for (const [genre, increase] of Object.entries(genreLevelIncreases)) {
    updatedGenreLevels[genre as Genre] = (updatedGenreLevels[genre as Genre] || 0) + increase;
  }

  const updatedProgress: UserProgress = {
    ...progress,
    totalXp: (progress.totalXp || 0) + xpGained,
    genreLevels: updatedGenreLevels,
    lootBoxesV3: [...(progress.lootBoxesV3 || []), ...lootBoxes],
    activeConsumables: tickConsumables(progress.activeConsumables || []),
  };

  return {
    bookLevelsGained: totalLevelsGained,
    newBookLevel: levelResult.newLevel + completionBonusLevels,
    xpGained,
    genreLevelIncreases: genreLevelIncreases as Record<Genre, number>,
    lootBoxes,
    bonusDropTriggered,
    activeEffects: companionEffects,
    updatedBook,
    updatedProgress,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/sessionRewards.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/sessionRewards.ts __tests__/lib/sessionRewards.test.ts
git commit -m "feat(rewards-v3): add session reward processor integrating all systems"
```

---

## Phase 9: Companion Generation Updates

### Task 17: Update Companion Research to Include Effects

**Files:**
- Modify: `lib/companionResearch.ts`
- Test: Manual verification (LLM-dependent)

**Step 1: Read current companionResearch.ts**

Read the file to understand existing prompt structure.

**Step 2: Update the research prompt**

Add instructions to generate companion effects. Update the companion generation prompt to include:

```typescript
// Add to the LLM prompt for companion generation
const effectsInstructions = `
Each companion should have 1-2 effects from:
- xp_boost: Increases XP gained (target a specific genre or global)
- luck_boost: Improves loot box tier chances
- drop_rate_boost: Chance for bonus loot drops

For the 2 legendary companions, one may have "completion_bonus" (extra levels on book completion).

Effect format:
{
  "effects": [
    { "type": "xp_boost", "targetGenre": "fantasy" },
    { "type": "luck_boost" }
  ]
}

Magnitude will be calculated based on rarity.
`;
```

**Step 3: Update companion interface in research output**

Ensure the generated companions include an `effects` field that matches the expected structure.

**Step 4: Commit**

```bash
git add lib/companionResearch.ts
git commit -m "feat(rewards-v3): update companion research to generate effects"
```

---

### Task 18: Designate Book-Specific Legendaries

**Files:**
- Modify: `lib/companionOrchestrator.ts`

**Step 1: Read current companionOrchestrator.ts**

Read the file to understand queue assignment.

**Step 2: Update queue assignment**

Ensure exactly 2 legendary companions per book:
- 1 assigned to `completionLegendary` (awarded on book finish)
- 1 assigned to `poolLegendary` (available in gold loot boxes)

```typescript
// In the companion assignment logic:
const legendaries = companions.filter(c => c.rarity === 'legendary');

if (legendaries.length >= 2) {
  // First legendary is completion reward
  bookCompanions.completionLegendary = legendaries[0];
  // Second legendary goes to loot pool
  bookCompanions.poolLegendary = legendaries[1];
} else if (legendaries.length === 1) {
  // If only one legendary, prioritize completion reward
  bookCompanions.completionLegendary = legendaries[0];
}
```

**Step 3: Update types if needed**

Ensure `BookCompanions` type includes `completionLegendary` and `poolLegendary` fields.

**Step 4: Commit**

```bash
git add lib/companionOrchestrator.ts lib/types.ts
git commit -m "feat(rewards-v3): designate book-specific legendary companions"
```

---

## Phase 10: UI Updates (Outlined)

> Note: UI tasks are outlined but not fully detailed. Each requires reading the existing component, understanding the current implementation, and integrating the new systems.

### Task 19: Update Timer Screen

**Files:**
- Modify: `app/timer/[bookId].tsx`

**Changes:**
1. Load equipped companions on session start
2. Calculate and display active modifiers
3. On session end:
   - Call `processSessionEnd()` instead of existing XP logic
   - Show level-up notifications
   - Show loot box earned notifications
   - Update slot progress

**Commit:** `feat(rewards-v3): integrate session rewards into timer screen`

---

### Task 20: Create Loadout UI Component

**Files:**
- Create: `components/LoadoutManager.tsx`

**Features:**
1. Display 3 slots (locked/unlocked state)
2. Show equipped companion in each slot
3. Tap to open companion selector
4. Show slot unlock progress bars

**Commit:** `feat(rewards-v3): add loadout manager component`

---

### Task 21: Update Collection Screen

**Files:**
- Modify: `app/(tabs)/collection.tsx`

**Changes:**
1. Add "Equip" button on companion cards
2. Show equipped indicator
3. Display companion effects
4. Show gating requirements if not met

**Commit:** `feat(rewards-v3): add equip functionality to collection screen`

---

### Task 22: Update Profile Screen

**Files:**
- Modify: `app/(tabs)/profile.tsx`

**Changes:**
1. Add genre level display section
2. Show loadout summary
3. Display active consumable effects
4. Show slot unlock progress

**Commit:** `feat(rewards-v3): add genre stats and loadout to profile screen`

---

### Task 23: Update Loot Box Screen

**Files:**
- Modify: `app/loot-box.tsx`
- Modify: `components/LootBoxReveal.tsx`

**Changes:**
1. Display box tier (wood/silver/gold) with visual distinction
2. Handle consumable drops (not just companions)
3. Show consumable effect description on reveal

**Commit:** `feat(rewards-v3): update loot box UI for tiers and consumables`

---

## Final Tasks

### Task 24: Add Data Migration

**Files:**
- Modify: `lib/migrations.ts`

**Changes:**
1. Create migration from v2 to v3
2. Initialize new fields with defaults
3. Preserve existing data

**Commit:** `feat(rewards-v3): add data migration for v3 schema`

---

### Task 25: Integration Testing

**Manual testing checklist:**
1. Start reading session, verify modifiers apply
2. Complete 1 hour, verify book levels up and loot box awarded
3. Open loot box, verify tier/category/item rolls work
4. Equip companion, verify effects apply to next session
5. Use consumable, verify effect applies and expires
6. Finish book, verify completion bonus and legendary awarded
7. Check slot unlock progress updates correctly

---

## Summary

**Total Tasks:** 25

**New Files Created:**
- `lib/genres.ts`
- `lib/companionEffects.ts`
- `lib/consumables.ts`
- `lib/bookLeveling.ts`
- `lib/loadout.ts`
- `lib/slotProgress.ts`
- `lib/lootV3.ts`
- `lib/consumableManager.ts`
- `lib/sessionRewards.ts`
- `components/LoadoutManager.tsx`

**Files Modified:**
- `lib/types.ts`
- `lib/storage.ts`
- `lib/bookEnrichment.ts`
- `lib/companionResearch.ts`
- `lib/companionOrchestrator.ts`
- `lib/migrations.ts`
- `app/timer/[bookId].tsx`
- `app/(tabs)/collection.tsx`
- `app/(tabs)/profile.tsx`
- `app/loot-box.tsx`
- `components/LootBoxReveal.tsx`
