# Reward System v2 Design

## Overview

A comprehensive item and progression system that makes XP and levels meaningful. Players earn loot boxes, collect equipment, build class sets, and unlock titles with passive bonuses.

## Core Loop

```
Reading → XP → Levels → Loot Boxes + Credits
                              ↓
                           Items
                              ↓
                     Equipment + Set Bonuses
                              ↓
                        Title + Passive
                              ↓
                      Enhanced Progression
```

---

## Progression

### XP & Levels

| Mechanic | Value |
|----------|-------|
| Base XP | 10 per minute of reading |
| Streak multiplier (3+ days) | 1.2x |
| Streak multiplier (7+ days) | 1.5x |
| XP per level | 1000 (linear) |

### Level Rewards

Each level grants:
- **1 Credit** - Spendable in shop
- **Set unlocks** - New classes become available at milestone levels

---

## Loot Boxes

Earned through various achievements, loot boxes drop items (equipment, consumables, collectibles).

### Earning Loot Boxes

| Trigger | Boxes Earned |
|---------|--------------|
| 3-day streak | 1 |
| 7-day streak | 2 |
| 14-day streak | 3 |
| 30-day streak | 5 |
| Every 250 XP | 1 |
| Book finished | 2 |
| Hours read milestones (5, 10, 25, 50, 100) | 1 each |
| Books added milestones (3, 5, 10, 15, 20) | 1 each |

### Drop Table

Loot boxes can contain:
- Equipment pieces (for unlocked sets)
- Consumables
- Collectibles

Rarity tiers match companions: **Common, Rare, Legendary**

---

## Items

### Item Types

| Type | Behavior |
|------|----------|
| **Consumables** | One-time use, activate for session or action-based effect |
| **Equipment** | Permanent, equip in slots for ongoing bonuses |
| **Collectibles** | Permanent, one equipped at a time for passive effect |

### Consumables

**Session Buffs** - Activate before reading, last for that session

| Name | Rarity | Effect |
|------|--------|--------|
| Focus Candle | Common | +25% XP this session |
| Scholar's Incense | Rare | +50% XP this session |
| Arcane Flame | Legendary | +100% XP this session |

**Action Triggers** - Activate anytime, affect next specific action

| Name | Rarity | Effect |
|------|--------|--------|
| Lucky Coin | Common | Next loot box: +15% rare chance |
| Rabbit's Foot | Rare | Next loot box: +30% rare, +10% legendary chance |
| Dragon's Eye | Legendary | Next loot box: +50% rare, +25% legendary chance |
| Streak Shield | Rare | Protects next missed day (doesn't break streak) |
| Time Crystal | Legendary | Next reading session counts double toward milestones |

**Stacking Rules:**
- No stacking within category
- One session buff active at a time
- One action trigger active at a time per action type

---

## Equipment System

### Slots

Three equipment slots, abstract enough to fit any class theme:

| Slot | Role |
|------|------|
| **Focus** | Primary power source |
| **Tool** | How you work |
| **Charm** | Passive luck/protection |

### Effect Types

Equipment can provide:
- XP boost (+X%)
- Loot luck (+X% rare/legendary chance)
- Streak protection (forgive missed days)
- Milestone acceleration (faster companion unlocks)
- Passive loot box generation (+X per week)
- Credit earnings (+X per level)
- Companion display slots

---

## Class Sets

### Overview

- Each class has 3 equipment pieces (one per slot)
- Equipping pieces from the same set grants bonuses
- Full set grants a title with additional passive

### Set Bonuses

| Pieces Equipped | Bonus |
|-----------------|-------|
| 2 of same set | Small set bonus |
| 3 of same set (full) | Full set bonus + Title |

### Starter Classes

| Class | Fantasy | Unlock Level | Title Effect Theme |
|-------|---------|--------------|-------------------|
| **Scholar** | Collector, completionist | 1 | Companion slots, credit bonuses |
| **Warrior** | Disciplined, enduring | 1 | Streak protection, consistency |
| **Mage** | Knowledge seeker, wisdom | 10 | XP and leveling bonuses |
| **Rogue** | Lucky, opportunistic | 20 | Loot luck and crit chances |

### Set Items by Class

| Slot | Scholar | Warrior | Mage | Rogue |
|------|---------|---------|------|-------|
| Focus | Tome | Battle Standard | Grimoire | Marked Deck |
| Tool | Quill | Whetstone | Crystal Orb | Lockpicks |
| Charm | Reading Glasses | Medal | Amulet | Lucky Coin |

### Future Sets

Additional sets can be added at higher levels (30, 40, 50+):
- Necromancer
- Bard
- Monk
- Ranger
- etc.

---

## Set Unlock Mechanics

### Level-Gated Introduction

When a player reaches the required level for a new set:
1. **First item** from that set enters the loot pool
2. Player pulls that item from a loot box
3. **Second item** enters the loot pool
4. Player pulls second item
5. **Third item** enters the loot pool
6. Player pulls third item → Full set complete, title earned

### Mystery Reveal

When a new set unlocks or next item becomes available:
- No specific item revealed
- Notification: *"A new Mage artifact awaits in the loot pool..."*
- Actual item revealed on drop

This creates:
- Controlled loot pool dilution (one item at a time)
- Anticipation for next piece
- Guaranteed progression toward set completion
- Surprise on each pull

---

## Credits & Shop

### Earning Credits

- 1 credit per level up

### Shop Contents

Credits can purchase:
- Specific consumables
- Possibly: cosmetic titles (text-based only)
- Possibly: collectibles

*Shop inventory TBD based on economy balancing*

---

## Collectibles

### Behavior

- Permanent items once obtained
- Only one can be equipped at a time
- Provides a passive effect while equipped

### Examples

*TBD - Could include:*
- Reading mascots (small passive effects)
- Achievement trophies
- Special event items

---

## Integration with Existing Systems

### Companions (unchanged)

- Book-specific, discovered through research
- Unlocked via reading time milestones or loot boxes (pool queue)
- Separate from generic item system

### Legacy Loot System

- `lib/loot.ts` (generic items like Hourglass, Scroll) - **deprecated**
- Replaced by this item/equipment system

### Loot Boxes (enhanced)

- `lib/lootBox.ts` currently drops companions from pool
- Expand to also drop: equipment, consumables, collectibles

---

## Data Model Additions

```typescript
// New types to add to lib/types.ts

export type ItemType = 'consumable' | 'equipment' | 'collectible';
export type ItemSlot = 'focus' | 'tool' | 'charm';
export type ItemRarity = 'common' | 'rare' | 'legendary';
export type ClassSet = 'scholar' | 'warrior' | 'mage' | 'rogue';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  icon: string;

  // Equipment-specific
  slot?: ItemSlot;
  set?: ClassSet;
  effect?: ItemEffect;

  // Consumable-specific
  consumableType?: 'session' | 'action';
  consumed?: boolean;
}

export interface ItemEffect {
  type: 'xp_boost' | 'loot_luck' | 'streak_protection' |
        'milestone_acceleration' | 'loot_generation' |
        'credit_bonus' | 'companion_slots';
  value: number; // Percentage or flat value
  duration?: number; // For consumables, in seconds
}

export interface PlayerEquipment {
  focus: Item | null;
  tool: Item | null;
  charm: Item | null;
  collectible: Item | null;
}

export interface SetProgress {
  set: ClassSet;
  unlockedAt: number; // Level when unlocked
  itemsInPool: number; // 0-3, how many items available
  itemsOwned: string[]; // Item IDs owned
}

// Update UserProgress to include:
export interface UserProgress {
  // ... existing fields
  credits: number;
  inventory: Item[];
  equipment: PlayerEquipment;
  setProgress: SetProgress[];
  activeConsumables: {
    session: Item | null;
    action: Item | null;
  };
}
```

---

## Open Questions

1. **Shop pricing** - How many credits per item type?
2. **Collectible specifics** - What collectibles exist, what effects?
3. **Set bonus values** - Exact percentages for 2-piece and 3-piece bonuses?
4. **Title passives** - Exact effects for each class title?
5. **Economy balancing** - Drop rates, credit earn rate vs spend rate?

---

## Implementation Phases

### Phase 1: Core Items
- Add item types to data model
- Create item definitions (consumables, starter equipment)
- Add inventory to UserProgress
- Basic inventory UI

### Phase 2: Equipment System
- Equipment slots UI
- Equip/unequip logic
- Item effect application during sessions

### Phase 3: Sets & Classes
- Set bonus calculations
- Title system
- Level-gated set unlocks
- Staggered loot pool introduction

### Phase 4: Shop & Polish
- Credit shop UI
- Economy balancing
- Collectibles system
