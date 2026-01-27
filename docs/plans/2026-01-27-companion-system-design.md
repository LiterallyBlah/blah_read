# Companion System Design

## Overview

Transform the companion system from a single companion per book (unlocked after 5 hours) to ~15 collectible companions per book representing characters, creatures, and iconic objects. Companions unlock through reading progress and a loot box system tied to achievements.

## Research Phase

### When It Happens

Research triggers when a book is added (via Kindle import or manual entry), alongside existing metadata enrichment.

### LLM Integration

- Use OpenRouter online models (web-access enabled) for book research
- Structured outputs via JSON schema for consistent parsing
- Goal: Identify key characters, creatures, and iconic objects from the book

### Entity Types

- **Characters** - Protagonists, antagonists, supporting cast
- **Creatures** - Beasts, monsters, magical beings
- **Objects** - Iconic items central to the story

### Research Output (Per Entity)

| Field | Description |
|-------|-------------|
| name | Entity name |
| type | character / creature / object |
| rarity | common / rare / legendary (based on narrative role) |
| description | 1-2 sentence summary |
| role | Role in the story |
| traits | Notable traits or abilities |
| visualDescription | Description for image generation |

### Fallback for Obscure Books

When research yields limited results (indie books, new releases, niche genres):

1. Use existing book synopsis to generate thematic companions
2. Mark these as **"Inspired"** vs **"Discovered"** companions
3. Always generate ~15 companions total - mix varies by available information

## Rarity System

Rarity assigned based on narrative role:

| Rarity | Count | Criteria |
|--------|-------|----------|
| Common | ~8 | Minor characters, everyday objects |
| Rare | ~4 | Supporting characters, significant creatures, notable items |
| Legendary | ~3 | Protagonist, antagonist, most iconic elements |

## Companion Distribution

After research, companions split into two queues:

| Queue | Count | Purpose |
|-------|-------|---------|
| Reading-time | ~7-8 | Unlock via reading milestones |
| Pool | ~7-8 | Unlock via loot boxes |

Higher importance companions go to reading-time queue; lower importance to pool.

### Legendary Distribution

- **1 reading-time legendary** - Unlocks at 5-hour milestone
- **1 pool legendary** - Rare lucky pull from loot boxes
- **1 completion legendary** - Unlocks when book marked "Finished"

## Unlock Mechanisms

### Reading-Time Unlocks (Front-Loaded)

| Milestone | Companion |
|-----------|-----------|
| 30 minutes | 1st |
| 1 hour | 2nd |
| 2 hours | 3rd |
| 3.5 hours | 4th |
| 5 hours | 5th (legendary) |
| 7 hours | 6th |
| 10 hours | 7th |

After reading-time queue exhausted: **1 loot box per additional hour** of reading.

### 5-Hour Check-In

At the 5-hour mark, prompt: *"How far through the book are you?"*

- Options: 25%, 50%, 75%, 90%, or skip
- If answered: Recalibrate remaining unlock milestones proportionally
- If skipped: Continue original schedule
- Unearned companions flow to loot box pool (nothing lost)

### Book Completion

When user marks book as "Finished":

- Completion legendary unlocks immediately
- 2 bonus loot boxes awarded

## Loot Box System

### Single Global Pool

All pool companions across all books feed into one global pool.

### Weighted Randomness

When pulling from pool:

- Higher weight for currently-reading book's companions
- Standard weight for other books' companions
- Legendary pulls are rare but possible

### Earning Loot Boxes

| Trigger | Boxes |
|---------|-------|
| 3-day streak | 1 |
| 7-day streak | 2 |
| 14-day streak | 3 |
| 30-day streak | 5 |
| Every 250 XP | 1 |
| Finish a book | 2 (plus legendary) |
| Add 3rd, 5th, 10th, 15th, 20th book | 1 each |
| Total hours read: 5, 10, 25, 50, 100hr | 1 each |
| Each hour after reading queue exhausted | 1 |

### Opening Boxes

- Boxes accumulate (not auto-opened)
- User opens manually from collection screen
- Can open multiple in sequence
- Reveal animation with fanfare

## Image Generation

### Lazy Generation with Buffer

1. **Randomize** unlock order within each queue
2. **Lock** the order (generation sequence won't spoil reveals)
3. **Generate buffer:**
   - 1-2 images from reading-time queue
   - 3 images from pool queue
4. **On unlock:** Generate next in that book's queue

This ensures instant reveals while spreading API costs.

### Generation Trigger

When a companion is unlocked, check if buffer is depleted and trigger background generation for the next companion in queue.

## Companion Card Display

Each unlocked companion shows:

- Generated pixel-art image
- Name
- Rarity badge (common/rare/legendary)
- Type (character / creature / object)
- Brief description
- Source book
- "Discovered" or "Inspired" tag

## UI & Collection

### Per-Book View (Book Detail Screen)

- Grid of companion cards
- Locked companions appear as silhouettes
- Progress: "5/15 companions unlocked"
- Next unlock milestone indicator
- Discovered vs Inspired distinction

### Dedicated Collection Screen

- All companions across all books
- Filters: book, rarity, type, discovered/inspired
- Sort: unlock date, rarity, book
- Stats: "47/120 companions collected"
- Visual gallery layout

### Loot Box UI

- Box count badge on collection tab
- "Open Box" button with reveal animation
- Option to open multiple in sequence
- Reveal shows companion with source book

### Unlock Notifications

- Subtle mid-session notification
- "New companion unlocked! View after session"
- Full reveal available when session ends

## Data Model

### Book Entity (additions)

```typescript
{
  companionResearchComplete: boolean;
  readingTimeQueue: Companion[];  // ordered, locked
  poolQueue: Companion[];         // ordered, locked
  unlockedCompanions: Companion[];
}
```

### Companion Entity (new)

```typescript
{
  id: string;
  bookId: string;
  name: string;
  type: 'character' | 'creature' | 'object';
  rarity: 'common' | 'rare' | 'legendary';
  description: string;
  traits: string;
  visualDescription: string;
  imageUrl: string | null;  // null until generated
  source: 'discovered' | 'inspired';
  unlockMethod: 'reading_time' | 'loot_box' | 'book_completion' | null;
  unlockedAt: number | null;  // timestamp
}
```

### Loot Box Tracking (new)

```typescript
{
  availableBoxes: number;
  boxHistory: Array<{
    openedAt: number;
    companionId: string;
  }>;
}
```

### Generation Queue (per book)

```typescript
{
  readingTimeNextIndex: number;  // next to generate in reading queue
  poolNextIndex: number;         // next to generate in pool queue
}
```

## OpenRouter Integration

### Online Models

Use OpenRouter's online model variants for web-access research:
- Documentation: https://openrouter.ai/docs/guides/routing/model-variants/online

### Structured Outputs

Use OpenRouter's structured outputs for consistent response parsing:
- Documentation: https://openrouter.ai/docs/guides/features/structured-outputs

### Research Schema

```typescript
{
  companions: Array<{
    name: string;
    type: 'character' | 'creature' | 'object';
    rarity: 'common' | 'rare' | 'legendary';
    description: string;
    role: string;
    traits: string;
    visualDescription: string;
  }>;
  researchConfidence: 'high' | 'medium' | 'low';
}
```

When `researchConfidence` is low, supplement with synopsis-based "Inspired" companions.
