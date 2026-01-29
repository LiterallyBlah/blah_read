# Session Results Screen Design

**Date:** 2026-01-29
**Status:** Approved

---

## Overview

Transform the post-session "black box" into a transparent, rewarding moment that educates, celebrates, and motivates.

**When it appears:** Mandatory after every reading session ends. User must dismiss to continue.

**Design philosophy:**
- Quick glancers see rewards → progress → next goal in 3 seconds
- Curious users can expand to see exactly how everything was calculated
- Big moments get celebrated, routine sessions stay lightweight

---

## Screen Structure

```
┌─────────────────────────────────────────┐
│           HERO MOMENT (if any)          │
│  "You discovered Gandalf!" / "Level 5!" │
│         [tap to continue]               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│            REWARDS EARNED               │
│  🎁 2 Loot Boxes    +450 XP (1.37x)    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│            PROGRESS MADE                │
│  Book Level 4 → 5                       │
│  Fantasy +1, Mystery +1                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│            NEXT MILESTONE               │
│  ████████████░░░░ 23 min → 🎁          │
│  "Next loot box"                        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          ▼ See details                  │
│  [Expandable: effects, math, odds]      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│            [Continue]                   │
└─────────────────────────────────────────┘
```

---

## Section 1: Hero Moment

The hero moment is the first thing users see when a notable event occurred. It takes over the top portion of the screen before revealing the standard summary below.

### Events That Trigger a Hero Moment (Priority Order)

| Priority | Event | Example Display |
|----------|-------|-----------------|
| 1 | New companion unlocked | "You discovered **Gandalf**!" + image |
| 2 | Slot unlocked | "Slot 2 Unlocked!" |
| 3 | Bonus drop triggered | "Lucky Find!" + loot box animation |
| 4 | Player level up | "Level 15!" |
| 5 | Genre threshold crossed | "Fantasy Master! Level 20 unlocked Legendary companions" |
| 6 | Streak threshold | "7-Day Streak! 1.5x XP activated" |
| 7 | Book level up | "Book Level 5!" |
| 8 | Genre level up | "Fantasy Level 14 → 15" |

### Behavior

- **Multiple events:** Show the highest priority one as the hero, others listed in the progress section below.
- **Nothing notable:** Skip the hero section entirely, go straight to rewards summary.
- **Interaction:** User taps anywhere or swipes up to scroll down to the full summary.

---

## Section 2: Rewards Earned

Answers "What did I get?" - the tangible takeaways from the session.

### Content

| Reward | Format | Example |
|--------|--------|---------|
| Loot boxes | Count + breakdown if mixed sources | "2 Loot Boxes" or "2 Loot Boxes (1 level up, 1 bonus drop)" |
| XP gained | Number + boost indicator if active | "+450 XP" or "+450 XP (1.37x boosted)" |

### Visual Treatment

- Loot boxes shown as small chest icons with quantity badge
- XP shown with a subtle +arrow or glow to feel like a gain
- If boosts were active, a small indicator (sparkle, colored text) hints there's more to learn in details

### What's NOT Here

- Genre XP breakdown (that's in Progress)
- Effect calculations (that's in Details)
- Companion unlocks (that's in Hero Moment)

---

## Section 3: Progress Made

Answers "How did I grow?" - showing level changes from the session.

### Content

| Progress Type | Format | Example |
|---------------|--------|---------|
| Book level | Before → After | "Book Level 4 → 5" |
| Player level | Before → After (if changed) | "Player Level 14 → 15" |
| Genre levels | List of increases | "Fantasy +1, Mystery +1" |

### Display Logic

- Book level always shown (it's the primary progression for current read)
- Player level only shown if it changed during session
- Genre levels collapsed if more than 2 changed: "Fantasy +1, Mystery +1, +2 more"

### Visual Treatment

- Level ups get a subtle highlight (background glow, checkmark)
- Unchanged levels not shown (no "Book Level 5 → 5")
- Genre icons/colors help quick scanning

### Edge Case

If session was very short (no levels gained), show: "Keep reading to earn your next level!" with progress bar instead.

---

## Section 4: Next Milestone

Answers "What's coming?" - motivating continued reading by showing nearby rewards.

### Selection Criteria

1. Must give a tangible reward (loot box, companion unlock, slot unlock)
2. Prioritize milestones related to current book
3. Show the nearest one that fits criteria

### Milestone Types

| Milestone | Trigger | Display |
|-----------|---------|---------|
| Next book level | Time-based | "23 min until next loot box" |
| Next companion unlock | Reading time milestone | "18 min until next companion" |
| Next slot unlock | Points threshold | "35 points until Slot 3" (with breakdown on tap) |
| Genre rarity unlock | Genre level 10/20 | "Fantasy Level 18 → 2 levels until Rare companions" |

### Format

Always frame as distance remaining, not absolute values. "23 min until..." not "Need 1380 more seconds."

### Visual Treatment

- Progress bar showing how close they are
- The reward icon (chest, companion silhouette, slot) at the end of the bar
- Percentage or time/points remaining as text

### Multiple Milestones

If multiple milestones are close, show up to 2, prioritizing the nearest reward-giving one first.

---

## Section 5: Expandable Details

Answers "How exactly did this work?" - full transparency for curious users.

### Collapsed State

A subtle link or chevron: "See details" or "How was this calculated?"

### Expanded Content

**1. Effect Breakdown**
```
Active Boosts This Session:
  XP: +25% Lucky Scroll, +12% Gandalf → 1.37x total
  Luck: +10% Four-Leaf Clover, +5% Lucky Penny → 0.15 total
  Drop Rate: +10% Treasure Map → 10% bonus drop chance
```

**2. XP Calculation**
```
32 min × 10 XP/min = 320 base XP
× 1.2 streak bonus (5-day streak)
× 1.37 boost multiplier
= 450 XP earned
```

**3. Genre Progress (all genres)**
```
Fantasy: 2,340 / 3,000 XP (78%)
Mystery: 1,890 / 3,000 XP (63%)
```

**4. Loot Box Odds (current state)**
```
Your luck stats: 0.15 luck, 0.10 rare_luck, 0 legendary_luck
Box chances: 59% Wood, 32% Silver, 9% Gold
Pity counter: 3 (next gold guaranteed in 22 boxes)
```

### Visual Treatment

Monospace or card-based layout. Educational, not overwhelming. Each sub-section collapsible if needed.

---

## Section 6: Bonus Drop Reveal

When a bonus drop triggers, it deserves special treatment as a rare, exciting moment.

### Trigger

`bonusDropTriggered: true` in session rewards

### Reveal Sequence

1. **Hero moment takes over** - "Lucky Find!" text with brief animation (sparkle, treasure chest appearing)
2. **Contextual explanation** - Small text: "Your Treasure Map triggered a bonus drop!" (or companion effect if applicable)
3. **The box** - Show the bonus loot box visually distinct (glowing border, different color)
4. **Transition** - After 1-2 seconds or user tap, scroll reveals the rest of the summary

### In the Rewards Section

The bonus box is listed separately:
```
2 Loot Boxes
  • 1 from level up
  • 1 bonus drop ✨
```

### In the Details Section

Show the math:
```
Drop Rate: 10% chance (Treasure Map consumable)
Roll: 0.07 → Triggered!
```

### When No Bonus Drop

Nothing special happens - no "you didn't get a bonus drop" messaging. Only celebrate wins.

---

## Data Requirements

The session results screen needs specific data from the session processing.

### Already Available in `SessionRewards`

- `xpGained` - Total XP earned
- `bookLevelsGained` - Number of book levels this session
- `newBookLevel` - Current book level after session
- `genreLevelIncreases` - Record of genre level changes
- `lootBoxes` - Array of boxes earned
- `bonusDropTriggered` - Boolean for bonus drop
- `activeEffects` - All boosts that were applied
- `updatedBook` - Book state after session
- `updatedProgress` - Player progress after session

### New Data Needed

| Field | Purpose |
|-------|---------|
| `previousBookLevel` | To show "Level 4 → 5" transition |
| `previousPlayerLevel` | To detect player level up |
| `previousGenreLevels` | To show genre transitions |
| `baseXpBeforeBoosts` | To show "320 base × 1.37 = 450" math |
| `streakMultiplier` | To show streak contribution separately |
| `nextMilestones` | Pre-calculated nearest milestones with time/points remaining |
| `heroEvents` | Prioritized list of notable events that occurred |

### Computed at Display Time

- Loot box odds (from current luck stats + pity counter)
- Genre progress percentages

---

## Key Principles

- **Educate:** Details explain the "why" for curious users
- **Celebrate:** Hero moments and rewards feel earned
- **Motivate:** Next milestone creates pull to keep reading
