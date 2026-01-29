# BlahRead Game Mechanics

This document outlines all game systems, their mechanics, and how they interact.

---

## Table of Contents

1. [Leveling Systems](#1-leveling-systems)
2. [Consumables](#2-consumables)
3. [Loot Box System](#3-loot-box-system)
4. [Companions](#4-companions)
5. [Loadout & Slots](#5-loadout--slots)
6. [Streaks](#6-streaks)
7. [Genres](#7-genres)
8. [Session Flow](#8-session-flow)
9. [System Interactions](#9-system-interactions)
10. [Constants Reference](#10-constants-reference)

---

## 1. Leveling Systems

There are three distinct leveling systems that operate simultaneously.

### 1.1 Player XP & Level

**Files:** `lib/xp.ts`, `lib/sessionRewards.ts`

| Constant | Value |
|----------|-------|
| XP per minute | 10 |
| XP per level | 1000 |

**Level Formula:**
```
level = floor(totalXp / 1000) + 1
```

**XP Calculation:**
```
xpGained = readingMinutes × 10 × streakMultiplier × (1 + xpBoosts)
```

Where `xpBoosts` is the sum of all active companion and consumable XP boost effects.

**Streak Multipliers:**

| Streak Days | Multiplier |
|-------------|------------|
| 0-2 | 1.0x |
| 3-6 | 1.2x |
| 7+ | 1.5x |

### 1.2 Book Leveling

**Files:** `lib/bookLeveling.ts`

Books level up independently based on reading time.

| Constant | Value |
|----------|-------|
| Seconds per level | 3600 (1 hour) |
| Pages per level (floor) | 30 |

**Level Calculation:**
```
hourlyLevels = floor(totalReadingSeconds / 3600)
pageFloor = floor(pageCount / 30)
```

**Completion Bonus:**
When a book is finished, bonus levels are awarded:
```
bonusLevels = max(0, pageFloor - hourlyLevels)
```

This ensures short books (by time) still award meaningful levels based on page count.

**Rewards:** Each book level earned generates 1 blank loot box.

### 1.3 Genre Levels

**Files:** `lib/genres.ts`, `lib/sessionRewards.ts`

When book levels are gained, XP is distributed proportionally across the book's genres.

**Example:** A fantasy/mystery book earns 3 levels → 1-2 levels distributed to each genre.

Genre levels unlock companion equip requirements and contribute to slot progression.

---

## 2. Consumables

**Files:** `lib/consumables.ts`, `lib/consumableManager.ts`

### 2.1 Consumable Tiers

| Tier | Effect Magnitude | Source |
|------|------------------|--------|
| weak | Low (10-15%) | Wood boxes |
| medium | Medium (20-30%) | Silver boxes |
| strong | High (50-100%) | Gold boxes |

### 2.2 Effect Types

| Effect | Description | Example Magnitude |
|--------|-------------|-------------------|
| `xp_boost` | Increases XP earned | 0.10 - 1.0 (+10% to +100%) |
| `luck` | Reduces wood box chance | 0.05 - 0.15 |
| `rare_luck` | Increases silver's share of non-wood | 0.10 |
| `legendary_luck` | Increases gold's share of non-wood | 0.15 |
| `drop_rate_boost` | Chance for bonus loot drops | 0.10 - 0.20 |
| `streak_shield` | Prevents streak loss | 1-3 days |
| `box_upgrade` | Upgrades next box tier | +1 tier |
| `guaranteed_companion` | Next box drops companion | 100% |
| `instant_level` | Instant book level up | Immediate |

### 2.3 Duration & Stacking

- Most consumables have 60-300 minute durations
- Instant effects (duration=0) apply immediately and aren't tracked
- Effects from multiple consumables stack **additively**
- Duration decrements by session length each reading session
- Applying the same consumable extends duration

### 2.4 Example Consumables

**Weak Tier:**
- Minor XP Scroll (+10% XP, 60 min)
- Lucky Penny (+5% luck, 60 min)
- Treasure Map Scrap (+10% drop rate, 60 min)

**Medium Tier:**
- XP Scroll (+25% XP, 120 min)
- Four-Leaf Clover (+10% luck, 120 min)
- Silver Horseshoe (+10% rare luck, 120 min)

**Strong Tier:**
- Double XP Tome (+100% XP, 60 min)
- Luck Charm (+15% luck, 180 min)
- Golden Aura (+15% legendary luck, 60 min)

---

## 3. Loot Box System

**Files:** `lib/lootBoxV3.ts`, `lib/lootV3.ts`, `app/loot-box.tsx`

### 3.1 Earning Boxes

| Source | Boxes Earned |
|--------|--------------|
| Book level up | 1 blank box per level |
| Completion bonus | 1 blank box per bonus level |
| Bonus drop (consumable) | ~10-20% chance per session |
| Post-milestone reading | 1 box per hour (after 10hr milestone) |

**Important:** All boxes are earned as "blank" - tier is determined at open time.

### 3.2 Three-Layer Rolling System

When opening a box, three sequential rolls determine the reward:

#### Layer 1: Box Tier

| Tier | Base Chance |
|------|-------------|
| Wood | 70% |
| Silver | 25% |
| Gold | 5% |

**Luck Modifiers:**
- `luck` stat reduces wood chance proportionally
- `rare_luck` increases silver's share of non-wood
- `legendary_luck` increases gold's share of non-wood (3x multiplier)

**Modified Calculation:**
```
woodChance = 0.70 × (1 - luck)
nonWoodChance = 1 - woodChance
silverShare = baseShare × (1 + rareLuck)
goldShare = baseShare × (1 + legendaryLuck × 3) + pityBonus
```

#### Layer 2: Category (Consumable vs Companion)

| Box Tier | Consumable | Companion |
|----------|------------|-----------|
| Wood | 90% | 10% |
| Silver | 60% | 40% |
| Gold | 25% | 75% |

**Note:** If companion pool is empty (all companions collected or filtered), forced to consumable.

#### Layer 3: Specific Item

**Consumable Selection:**
| Box Tier | Consumable Tier |
|----------|-----------------|
| Wood | weak |
| Silver | medium |
| Gold | strong |

**Companion Rarity Selection:**
| Box Tier | Common | Rare | Legendary |
|----------|--------|------|-----------|
| Wood | 100% | 0% | 0% |
| Silver | 60% | 40% | 0% |
| Gold | 10% | 60% | 30% |

### 3.3 Pity System

Guarantees gold boxes over time for unlucky players.

| Constant | Value |
|----------|-------|
| Pity bonus per miss | +3% gold chance |
| Hard cap | 25 non-gold boxes |

**Mechanics:**
- Each non-gold box opened adds +3% to gold chance
- At 25 consecutive non-gold boxes, next box is guaranteed gold
- Counter resets to 0 when any gold box is obtained
- Pity stacks with luck stats

---

## 4. Companions

**Files:** `lib/types.ts`, `lib/companionEffects.ts`, `lib/companionResearch.ts`

### 4.1 Companion Properties

| Property | Values |
|----------|--------|
| Type | character, creature, object |
| Rarity | common, rare, legendary |
| Source | discovered (from book), inspired (system) |
| Unlock Method | reading_time, loot_box, book_completion |

### 4.2 Rarity & Effect Magnitudes

| Rarity | Effect Range | Genre Level Req | Book Level Req |
|--------|--------------|-----------------|----------------|
| Common | 3-7% | None | None |
| Rare | 12-18% | 10 | 5 |
| Legendary | 25-35% | 20 | 10 |

### 4.3 Companion Effects

Same effect types as consumables:
- `xp_boost` - Increases XP earned
- `luck` - Reduces wood box chance
- `rare_luck` - Increases silver's share
- `legendary_luck` - Increases gold's share
- `drop_rate_boost` - Bonus drop chance
- `completion_bonus` - Extra levels on book completion (legendary only)

**Targeting:** Effects can be global or genre-specific. Genre-targeted effects only apply when reading books of that genre.

### 4.4 Companion Generation

**Process (via LLM):**
1. Research book content via OpenRouter API
2. Identify 15 notable entities (characters, creatures, objects)
3. Assign rarity based on narrative importance
4. Create 1-2 effects per companion
5. Generate images asynchronously (queued)

**Confidence Levels:** high, medium, low (based on book documentation quality)

### 4.5 Unlocking Companions

**Reading Time Milestones (per book):**

| Milestone | Time |
|-----------|------|
| 1 | 30 minutes |
| 2 | 1 hour |
| 3 | 2 hours |
| 4 | 3.5 hours |
| 5 | 5 hours |
| 6 | 7 hours |
| 7 | 10 hours |

After all 7 milestones: 1 loot box per additional hour of reading.

**Priority:** Prefers companions with images available, falls back to any unlocked.

---

## 5. Loadout & Slots

**Files:** `lib/loadout.ts`, `lib/slotProgress.ts`

### 5.1 Loadout Structure

- 3 total companion slots (fixed)
- Start with 1 slot unlocked
- Slots 2 and 3 unlocked via progression

### 5.2 Slot Unlock Progression

Points-based system with different criteria per slot.

**Slot 2 (100 points required):**

| Activity | Points |
|----------|--------|
| First book finished | 50 |
| Hours logged | 15 per hour |
| Companions collected | 20 each |
| Sessions completed | 10 each |

**Slot 3 (300 points required):**

| Activity | Points |
|----------|--------|
| Books finished | 40 each |
| Hours logged | 10 per hour |
| Companions collected | 15 each |
| Genres at level 10 | 50 each |
| Unique genres read | 30 each |

### 5.3 Effect Calculation

Equipped companion effects stack additively:
```
totalLuck = sum(companion.effects.luck for companion in loadout if active)
```

Genre-targeted effects only apply when book genres match.

---

## 6. Streaks

**Files:** `lib/streak.ts`

### 6.1 Mechanics

| Property | Description |
|----------|-------------|
| Current Streak | Consecutive days with reading activity |
| Longest Streak | Historical maximum |
| Last Read Date | YYYY-MM-DD of most recent reading |

**Update Logic:**
- Same day reading: No change
- Consecutive day: Increment current streak
- Gap > 1 day: Reset to 1
- Current exceeds longest: Update longest

### 6.2 Streak Impact

| Days | XP Multiplier |
|------|---------------|
| 0-2 | 1.0x |
| 3-6 | 1.2x |
| 7+ | 1.5x |

### 6.3 Streak Shield

Consumable effect that prevents streak reset for 1-3 days (based on tier).

---

## 7. Genres

**Files:** `lib/genres.ts`

### 7.1 Available Genres

1. fantasy
2. sci-fi
3. mystery-thriller
4. horror
5. romance
6. literary-fiction
7. history
8. biography-memoir
9. science-nature
10. self-improvement
11. business-finance
12. philosophy-religion

### 7.2 Genre Assignment

Books are assigned genres via keyword mapping from metadata (Google Books, Open Library, etc.).

**Example Mappings:**
- "science fiction", "sci-fi", "space", "cyberpunk" → sci-fi
- "detective", "crime", "suspense" → mystery-thriller

### 7.3 Genre Mechanics

- **Level Distribution:** Book levels distribute across book genres
- **Companion Targeting:** Effects can target specific genres
- **Equip Requirements:** Rare/Legendary companions require genre levels to equip
- **Slot Progression:** Genre diversity contributes to slot 3 unlock

---

## 8. Session Flow

**Files:** `lib/sessionRewards.ts`

When a reading session ends, the following processing occurs:

### 8.1 Processing Steps

1. **Calculate Effects**
   - Gather companion effects based on loadout + book genres
   - Gather consumable effects from active consumables
   - Combine all boosts (XP, luck, rare_luck, legendary_luck, drop_rate)

2. **Process Book Progress**
   - Calculate reading time → award book levels
   - If book completed: add page-based bonus levels

3. **Calculate XP**
   - Apply boosts and streak multiplier
   - Add to player total XP

4. **Distribute Genre Levels**
   - Spread earned levels across book genres

5. **Generate Loot Boxes**
   - 1 blank box per level gained
   - 1 blank box per completion bonus level
   - Roll for bonus drop (based on drop_rate_boost)

6. **Update Consumables**
   - Decrement durations by session length
   - Remove expired consumables

7. **Save Progress**
   - Update player progress and book progression

### 8.2 Session Rewards Object

```typescript
{
  bookLevelsGained: number
  newBookLevel: number
  xpGained: number
  genreLevelIncreases: Record<Genre, number>
  lootBoxes: LootBoxV3[]
  bonusDropTriggered: boolean
  activeEffects: ActiveEffects
  updatedBook: Book
  updatedProgress: UserProgress
}
```

---

## 9. System Interactions

### 9.1 Companions → Loot Boxes

```
Equipped companions provide luck stats
        ↓
Luck stats applied during box tier rolling
        ↓
Higher tier boxes = better rewards
```

### 9.2 Consumables → Sessions

```
Active consumables provide boosts
        ↓
Boosts applied during session processing
        ↓
Duration decrements by session length
```

### 9.3 Genres → Companions

```
Book assigned normalized genres
        ↓
Companion effects checked against book genres
        ↓
Genre-targeted effects only apply if match
```

### 9.4 Book Completion → Slot Progress

```
Book completion triggers bonus levels
        ↓
Levels contribute to slot unlock points
        ↓
Completed books count toward slot 3
```

### 9.5 Streaks → XP

```
Streak tracked daily
        ↓
Affects XP multiplier calculation
        ↓
Streak shields prevent reset
```

### 9.6 Full Flow Diagram

```
Reading Session
      ↓
┌─────────────────────────────────────────────┐
│ Calculate Active Effects                     │
│ (Companions + Consumables + Streaks)        │
└─────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────┐
│ Process Book Progress                        │
│ - Award book levels (time-based)            │
│ - Add completion bonus (page-based)         │
└─────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────┐
│ Calculate & Award XP                         │
│ XP = minutes × 10 × streak × (1 + boosts)   │
└─────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────┐
│ Distribute Genre Levels                      │
│ (Proportional to book genres)               │
└─────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────┐
│ Generate Loot Boxes                          │
│ - 1 per level + 1 per bonus + bonus drop    │
└─────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────┐
│ Update Consumables                           │
│ (Decrement durations, remove expired)       │
└─────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────┐
│ Update Progress                              │
│ (XP, levels, streaks, slot progress)        │
└─────────────────────────────────────────────┘
```

---

## 10. Constants Reference

### XP System
| Constant | Value |
|----------|-------|
| XP_PER_MINUTE | 10 |
| XP_PER_LEVEL | 1000 |

### Book Leveling
| Constant | Value |
|----------|-------|
| SECONDS_PER_LEVEL | 3600 |
| PAGES_PER_LEVEL | 30 |

### Companion Milestones
| Constant | Value |
|----------|-------|
| Milestones | [30m, 1h, 2h, 3.5h, 5h, 7h, 10h] |
| Post-milestone interval | 3600 seconds |

### Slot Progression
| Constant | Value |
|----------|-------|
| SLOT_2_POINTS | 100 |
| SLOT_3_POINTS | 300 |

### Pity System
| Constant | Value |
|----------|-------|
| PITY_BONUS_PER_MISS | 0.03 (+3%) |
| PITY_HARD_CAP | 25 |

### Loot Box Base Odds
| Tier | Chance |
|------|--------|
| Wood | 70% |
| Silver | 25% |
| Gold | 5% |

### Category Distribution
| Box Tier | Consumable | Companion |
|----------|------------|-----------|
| Wood | 90% | 10% |
| Silver | 60% | 40% |
| Gold | 25% | 75% |

### Companion Rarity Distribution
| Box Tier | Common | Rare | Legendary |
|----------|--------|------|-----------|
| Wood | 100% | 0% | 0% |
| Silver | 60% | 40% | 0% |
| Gold | 10% | 60% | 30% |

---

## File Reference

| System | Primary Files |
|--------|---------------|
| Player XP/Level | `lib/xp.ts`, `lib/sessionRewards.ts` |
| Book Leveling | `lib/bookLeveling.ts` |
| Genre Levels | `lib/genres.ts`, `lib/sessionRewards.ts` |
| Consumables | `lib/consumables.ts`, `lib/consumableManager.ts` |
| Loot Boxes | `lib/lootBoxV3.ts`, `lib/lootV3.ts` |
| Companions | `lib/companionResearch.ts`, `lib/companionEffects.ts` |
| Loadout/Slots | `lib/loadout.ts`, `lib/slotProgress.ts` |
| Streaks | `lib/streak.ts` |
| Session Flow | `lib/sessionRewards.ts` |
| Storage | `lib/storage.ts` |
| Types | `lib/types.ts` |
