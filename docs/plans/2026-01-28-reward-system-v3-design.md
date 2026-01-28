# Reward System V3 Design

## Overview

A book-centric progression system where users level up individual books, earn loot through layered RNG, and equip companions with meaningful effects. The system creates a cohesive loop: reading levels books, leveling triggers loot, loot provides companions, companions enhance reading.

## Core Principles

- **Book-centric, not profile-centric**: You level books, not yourself
- **Simple base mechanics**: 1 level per hour, page-based floor
- **Meaningful companions**: Effects impact gameplay, not just collectibles
- **Layered rewards**: Every level guarantees something; rarity is the variable

---

## 1. Book Leveling

### During Reading
- 1 level per hour of tracked reading time
- Levels accrue throughout sessions

### At Completion
- Calculate page-based floor: 1 level per X pages (tunable)
- If hourly levels < page-based levels → award difference as completion bonus
- Guarantees fast readers aren't penalized

### Page Count Source
- Primary: Google Books API (`pageCount` field)
- Fallback: User supplies manually (from Kindle's "About this book")

### Example
300-page book, floor = 1 level per 25 pages = 12 levels minimum

| Reader | Hours | Hourly Levels | Floor | Completion Bonus | Total |
|--------|-------|---------------|-------|------------------|-------|
| Fast   | 4     | 4             | 12    | +8               | 12    |
| Slow   | 15    | 15            | 12    | 0                | 15    |

---

## 2. Genres

### Purpose
- Companion targeting ("+15% XP for Fantasy books")
- Derivative leveling (book level up → genre levels +1)
- Gating legendary companions ("Requires Fantasy Level 20")

### The 12 Genres

| Fiction           | Non-Fiction          |
|-------------------|----------------------|
| Fantasy           | History              |
| Sci-Fi            | Biography & Memoir   |
| Mystery & Thriller| Science & Nature     |
| Horror            | Self-Improvement     |
| Romance           | Business & Finance   |
| Literary Fiction  | Philosophy & Religion|

### Genre Assignment
- LLM maps Google Books categories to these 12 buckets
- Books can have multiple genres
- XP bonuses from companions apply to all matching genres

### Genre Leveling
- When a book levels up, all its genres gain +1 level
- Genre levels are cumulative stats, not a separate progression system
- Used for display, achievements, and companion gating

---

## 3. Companions

### Effect Types

| Effect          | Description                              | Availability    |
|-----------------|------------------------------------------|-----------------|
| XP Boost        | +X% XP when reading matching genre       | All rarities    |
| Luck Boost      | Shifts loot box tier odds upward         | All rarities    |
| Drop Rate Boost | Chance for bonus loot during sessions    | All rarities    |
| Completion Bonus| Extra levels when finishing a book       | Legendary only  |

### Rarity & Magnitude

| Rarity    | Effect Range | Multi-stat Chance |
|-----------|--------------|-------------------|
| Common    | ~5%          | Low               |
| Rare      | ~15%         | Medium            |
| Legendary | ~30%         | High              |

- All rarities can have multiple stats
- Higher rarity = higher chance of multi-stat
- Effects stack additively when multiple companions equipped

### Genre Targeting
- Companions can target specific genres: "+15% XP for Fantasy books"
- Effect applies when reading any book tagged with that genre
- Multi-genre books can benefit from multiple companion bonuses

### Loadout

- 3 slots total, unrestricted (any companion in any slot)
- Slots unlocked via progress bar milestones

**Slot 2 (100 points):**

| Milestone              | Points |
|------------------------|--------|
| Finish your first book | 50     |
| Log 1 hour of reading  | 15     |
| Collect a companion    | 20     |
| Complete a reading session | 10 |

**Slot 3 (300 points):**

| Milestone                  | Points |
|----------------------------|--------|
| Finish a book              | 40     |
| Log 1 hour of reading      | 10     |
| Collect a companion        | 15     |
| Reach genre level 10       | 50     |
| Read a book in a new genre | 30     |

---

## 4. Loot System

### Drop Triggers

| Trigger       | What Happens                                    |
|---------------|------------------------------------------------|
| Book level up | Guaranteed loot box (tier determined by RNG)   |
| During session| Chance for bonus box (affected by drop rate)   |
| Book completion| Guaranteed book-specific legendary companion  |

### Three-Layer RNG

**Layer 1: Box Tier** (affected by luck stat)

| Tier   | Base Chance |
|--------|-------------|
| Wood   | 70%         |
| Silver | 25%         |
| Gold   | 5%          |

**Layer 2: Category** (based on box tier)

| Box    | Consumable | Companion |
|--------|------------|-----------|
| Wood   | 90%        | 10%       |
| Silver | 60%        | 40%       |
| Gold   | 25%        | 75%       |

**Layer 3a: Consumable Tier** (if consumable)

| Box    | Weak | Medium | Strong |
|--------|------|--------|--------|
| Wood   | 80%  | 20%    | 0%     |
| Silver | 30%  | 60%    | 10%    |
| Gold   | 0%   | 40%    | 60%    |

**Layer 3b: Companion Rarity** (if companion)

| Box    | Common | Rare | Legendary |
|--------|--------|------|-----------|
| Wood   | 100%   | 0%   | 0%        |
| Silver | 60%    | 40%  | 0%        |
| Gold   | 10%    | 60%  | 30%       |

### Consumables

**Weak (Wood box tier):**
- +10% XP next session
- +5% luck next 2 sessions
- +10% drop rate on next level up
- 1-day streak shield

**Medium (Silver box tier):**
- +25% XP next session
- +15% luck next 3 sessions
- +20% drop rate next 2 level ups
- 3-day streak shield
- Upgrade next box (Wood → Silver, Silver → Gold)

**Strong (Gold box tier):**
- Double XP next session
- +50% XP for 3 sessions
- +30% luck for 5 sessions
- Guaranteed companion on next box
- Instant level up on current book

---

## 5. Book-Specific Legendaries

Each book has two legendary companions:

1. **Completion Legendary**: Awarded when the book is finished
2. **Pool Legendary**: Available in general Gold box loot pool

This ensures:
- Finishing books is always rewarding
- Rare drops from boxes can include book-themed companions
- Collection completionists have clear goals

---

## 6. System Loop Summary

```
┌─────────────────────────────────────────────────────────┐
│                    START SESSION                         │
│         (Snapshot active companion modifiers)            │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      READING                             │
│    • Track time                                          │
│    • Drop rate check for bonus loot                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    BOOK LEVELS UP                        │
│    • Apply XP modifiers from companions                  │
│    • Genre levels increase                               │
│    • Roll for loot box (guaranteed)                      │
│    • Roll for box tier (luck modifier)                   │
│    • Roll for contents                                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  BOOK COMPLETED?                         │
│    • Calculate page-based floor                          │
│    • Award completion bonus levels if needed             │
│    • Award book-specific legendary companion             │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   END SESSION                            │
│    • Update library                                      │
│    • Check slot unlock progress                          │
│    • Apply any consumable effects for next session       │
└─────────────────────────────────────────────────────────┘
```

---

## Open Questions for Implementation

1. **Page-based floor ratio**: What's the right pages-per-level? (Suggested: 25 pages = 1 level)
2. **Drop rate frequency**: How often to check for bonus drops? (Per session end? Every 30 min?)
3. **Companion generation**: How are book-specific legendary companions created? (LLM-generated? Pre-designed?)
4. **Consumable stacking**: Can multiple consumables be active? Do they stack?
5. **Genre gating thresholds**: What genre levels required for legendary companions?
