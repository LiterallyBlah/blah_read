# Reward System v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a comprehensive item and equipment system that makes XP/levels meaningful through credits, items, equipment slots, class sets, and titles.

**Architecture:** Extend existing `lib/types.ts` with item types, create `lib/items.ts` for item definitions and logic, `lib/equipment.ts` for equip/set bonus calculations, and `lib/credits.ts` for credit management. Integrate with existing `lib/lootBox.ts` for drops. UI in new `app/inventory.tsx` and `app/equipment.tsx` screens.

**Tech Stack:** TypeScript, React Native, AsyncStorage (via existing `lib/storage.ts`), Jest for testing

---

## Phase 1: Core Item Types & Definitions

### Task 1: Add Item Types to Data Model

**Files:**
- Modify: `lib/types.ts`
- Create: `__tests__/lib/itemTypes.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/itemTypes.test.ts
import type {
  ItemType,
  ItemSlot,
  ItemRarity,
  ClassSet,
  Item,
  ItemEffect,
  PlayerEquipment,
  SetProgress,
} from '@/lib/types';

describe('item types', () => {
  it('ItemType has correct values', () => {
    const types: ItemType[] = ['consumable', 'equipment', 'collectible'];
    expect(types).toHaveLength(3);
  });

  it('ItemSlot has correct values', () => {
    const slots: ItemSlot[] = ['focus', 'tool', 'charm'];
    expect(slots).toHaveLength(3);
  });

  it('ClassSet has correct values', () => {
    const sets: ClassSet[] = ['scholar', 'warrior', 'mage', 'rogue'];
    expect(sets).toHaveLength(4);
  });

  it('Item interface has required fields', () => {
    const item: Item = {
      id: 'test-item',
      name: 'Test Item',
      type: 'equipment',
      rarity: 'common',
      description: 'A test item',
      icon: 'sword',
      slot: 'focus',
      set: 'warrior',
      effect: { type: 'xp_boost', value: 10 },
    };
    expect(item.id).toBe('test-item');
    expect(item.slot).toBe('focus');
    expect(item.set).toBe('warrior');
  });

  it('PlayerEquipment has three slots plus collectible', () => {
    const equipment: PlayerEquipment = {
      focus: null,
      tool: null,
      charm: null,
      collectible: null,
    };
    expect(equipment.focus).toBeNull();
    expect(equipment.tool).toBeNull();
    expect(equipment.charm).toBeNull();
    expect(equipment.collectible).toBeNull();
  });

  it('SetProgress tracks set unlock state', () => {
    const progress: SetProgress = {
      set: 'scholar',
      unlockedAt: 1,
      itemsInPool: 1,
      itemsOwned: [],
    };
    expect(progress.set).toBe('scholar');
    expect(progress.itemsInPool).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/itemTypes.test.ts`
Expected: FAIL with "Cannot find module" or type errors

**Step 3: Write implementation**

Add to `lib/types.ts`:

```typescript
// === ITEM SYSTEM TYPES ===

export type ItemType = 'consumable' | 'equipment' | 'collectible';
export type ItemSlot = 'focus' | 'tool' | 'charm';
export type ItemRarity = 'common' | 'rare' | 'legendary';
export type ClassSet = 'scholar' | 'warrior' | 'mage' | 'rogue';

export type ItemEffectType =
  | 'xp_boost'
  | 'loot_luck_rare'
  | 'loot_luck_legendary'
  | 'streak_protection'
  | 'milestone_acceleration'
  | 'loot_generation'
  | 'credit_bonus'
  | 'companion_slots';

export interface ItemEffect {
  type: ItemEffectType;
  value: number; // Percentage or flat value depending on type
}

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
  actionTarget?: 'loot_box' | 'streak' | 'milestone';
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
  itemsInPool: number; // 0-3, how many items available in loot pool
  itemsOwned: string[]; // Item IDs owned from this set
}

export interface ActiveConsumables {
  session: Item | null;
  action: {
    loot_box: Item | null;
    streak: Item | null;
    milestone: Item | null;
  };
}
```

**Step 4: Update UserProgress interface**

Still in `lib/types.ts`, update the `UserProgress` interface:

```typescript
export interface UserProgress {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;
  lootItems: LootItem[];
  lootBoxes: LootBoxState;
  booksFinished: number;
  booksAdded: number;
  totalHoursRead: number;
  // New fields for reward system v2
  credits: number;
  inventory: Item[];
  equipment: PlayerEquipment;
  setProgress: SetProgress[];
  activeConsumables: ActiveConsumables;
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- __tests__/lib/itemTypes.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add lib/types.ts __tests__/lib/itemTypes.test.ts
git commit -m "feat: add item system types to data model"
```

---

### Task 2: Create Item Definitions

**Files:**
- Create: `lib/itemDefinitions.ts`
- Create: `__tests__/lib/itemDefinitions.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/itemDefinitions.test.ts
import {
  CONSUMABLES,
  EQUIPMENT,
  getItemById,
  getEquipmentBySet,
  getConsumablesByType,
} from '@/lib/itemDefinitions';

describe('itemDefinitions', () => {
  describe('CONSUMABLES', () => {
    it('has session buff consumables', () => {
      const sessionBuffs = CONSUMABLES.filter(c => c.consumableType === 'session');
      expect(sessionBuffs.length).toBeGreaterThanOrEqual(3);
      expect(sessionBuffs.some(c => c.name === 'Focus Candle')).toBe(true);
    });

    it('has action trigger consumables', () => {
      const actionTriggers = CONSUMABLES.filter(c => c.consumableType === 'action');
      expect(actionTriggers.length).toBeGreaterThanOrEqual(5);
      expect(actionTriggers.some(c => c.name === 'Lucky Coin')).toBe(true);
    });

    it('consumables have correct rarity distribution', () => {
      expect(CONSUMABLES.filter(c => c.rarity === 'common').length).toBeGreaterThanOrEqual(2);
      expect(CONSUMABLES.filter(c => c.rarity === 'rare').length).toBeGreaterThanOrEqual(2);
      expect(CONSUMABLES.filter(c => c.rarity === 'legendary').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('EQUIPMENT', () => {
    it('has 3 items per set', () => {
      const scholarItems = EQUIPMENT.filter(e => e.set === 'scholar');
      const warriorItems = EQUIPMENT.filter(e => e.set === 'warrior');
      expect(scholarItems).toHaveLength(3);
      expect(warriorItems).toHaveLength(3);
    });

    it('each set has one item per slot', () => {
      const scholarItems = EQUIPMENT.filter(e => e.set === 'scholar');
      const slots = scholarItems.map(e => e.slot);
      expect(slots).toContain('focus');
      expect(slots).toContain('tool');
      expect(slots).toContain('charm');
    });

    it('mage and rogue sets exist but are level-gated', () => {
      const mageItems = EQUIPMENT.filter(e => e.set === 'mage');
      const rogueItems = EQUIPMENT.filter(e => e.set === 'rogue');
      expect(mageItems).toHaveLength(3);
      expect(rogueItems).toHaveLength(3);
    });
  });

  describe('getItemById', () => {
    it('returns item when found', () => {
      const item = getItemById('consumable-focus-candle');
      expect(item).toBeDefined();
      expect(item?.name).toBe('Focus Candle');
    });

    it('returns undefined when not found', () => {
      const item = getItemById('nonexistent');
      expect(item).toBeUndefined();
    });
  });

  describe('getEquipmentBySet', () => {
    it('returns all items for a set', () => {
      const items = getEquipmentBySet('warrior');
      expect(items).toHaveLength(3);
      expect(items.every(i => i.set === 'warrior')).toBe(true);
    });
  });

  describe('getConsumablesByType', () => {
    it('returns session consumables', () => {
      const items = getConsumablesByType('session');
      expect(items.every(i => i.consumableType === 'session')).toBe(true);
    });

    it('returns action consumables', () => {
      const items = getConsumablesByType('action');
      expect(items.every(i => i.consumableType === 'action')).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/itemDefinitions.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write implementation**

```typescript
// lib/itemDefinitions.ts
import type { Item, ClassSet } from './types';

// === CONSUMABLES ===

export const CONSUMABLES: Item[] = [
  // Session Buffs - XP boost for current reading session
  {
    id: 'consumable-focus-candle',
    name: 'Focus Candle',
    type: 'consumable',
    rarity: 'common',
    description: '+25% XP this session',
    icon: '🕯️',
    consumableType: 'session',
    effect: { type: 'xp_boost', value: 25 },
  },
  {
    id: 'consumable-scholars-incense',
    name: "Scholar's Incense",
    type: 'consumable',
    rarity: 'rare',
    description: '+50% XP this session',
    icon: '🪔',
    consumableType: 'session',
    effect: { type: 'xp_boost', value: 50 },
  },
  {
    id: 'consumable-arcane-flame',
    name: 'Arcane Flame',
    type: 'consumable',
    rarity: 'legendary',
    description: '+100% XP this session',
    icon: '🔥',
    consumableType: 'session',
    effect: { type: 'xp_boost', value: 100 },
  },

  // Action Triggers - Loot box luck
  {
    id: 'consumable-lucky-coin',
    name: 'Lucky Coin',
    type: 'consumable',
    rarity: 'common',
    description: 'Next loot box: +15% rare chance',
    icon: '🪙',
    consumableType: 'action',
    actionTarget: 'loot_box',
    effect: { type: 'loot_luck_rare', value: 15 },
  },
  {
    id: 'consumable-rabbits-foot',
    name: "Rabbit's Foot",
    type: 'consumable',
    rarity: 'rare',
    description: 'Next loot box: +30% rare, +10% legendary',
    icon: '🐰',
    consumableType: 'action',
    actionTarget: 'loot_box',
    effect: { type: 'loot_luck_rare', value: 30 },
  },
  {
    id: 'consumable-dragons-eye',
    name: "Dragon's Eye",
    type: 'consumable',
    rarity: 'legendary',
    description: 'Next loot box: +50% rare, +25% legendary',
    icon: '🐉',
    consumableType: 'action',
    actionTarget: 'loot_box',
    effect: { type: 'loot_luck_rare', value: 50 },
  },

  // Action Triggers - Streak protection
  {
    id: 'consumable-streak-shield',
    name: 'Streak Shield',
    type: 'consumable',
    rarity: 'rare',
    description: 'Protects next missed day',
    icon: '🛡️',
    consumableType: 'action',
    actionTarget: 'streak',
    effect: { type: 'streak_protection', value: 1 },
  },

  // Action Triggers - Milestone acceleration
  {
    id: 'consumable-time-crystal',
    name: 'Time Crystal',
    type: 'consumable',
    rarity: 'legendary',
    description: 'Next session counts double toward milestones',
    icon: '💎',
    consumableType: 'action',
    actionTarget: 'milestone',
    effect: { type: 'milestone_acceleration', value: 100 },
  },
];

// === EQUIPMENT ===

export const EQUIPMENT: Item[] = [
  // Scholar Set (Level 1)
  {
    id: 'equipment-scholar-tome',
    name: 'Tome',
    type: 'equipment',
    rarity: 'common',
    description: '+1 companion display slot',
    icon: '📖',
    slot: 'focus',
    set: 'scholar',
    effect: { type: 'companion_slots', value: 1 },
  },
  {
    id: 'equipment-scholar-quill',
    name: 'Quill',
    type: 'equipment',
    rarity: 'common',
    description: '+1 credit per level',
    icon: '🪶',
    slot: 'tool',
    set: 'scholar',
    effect: { type: 'credit_bonus', value: 1 },
  },
  {
    id: 'equipment-scholar-glasses',
    name: 'Reading Glasses',
    type: 'equipment',
    rarity: 'common',
    description: '+5% XP from reading',
    icon: '👓',
    slot: 'charm',
    set: 'scholar',
    effect: { type: 'xp_boost', value: 5 },
  },

  // Warrior Set (Level 1)
  {
    id: 'equipment-warrior-standard',
    name: 'Battle Standard',
    type: 'equipment',
    rarity: 'common',
    description: 'Forgive 1 missed day per week',
    icon: '🚩',
    slot: 'focus',
    set: 'warrior',
    effect: { type: 'streak_protection', value: 1 },
  },
  {
    id: 'equipment-warrior-whetstone',
    name: 'Whetstone',
    type: 'equipment',
    rarity: 'common',
    description: '+5% milestone acceleration',
    icon: '🪨',
    slot: 'tool',
    set: 'warrior',
    effect: { type: 'milestone_acceleration', value: 5 },
  },
  {
    id: 'equipment-warrior-medal',
    name: 'Medal',
    type: 'equipment',
    rarity: 'common',
    description: '+5% XP from reading',
    icon: '🎖️',
    slot: 'charm',
    set: 'warrior',
    effect: { type: 'xp_boost', value: 5 },
  },

  // Mage Set (Level 10)
  {
    id: 'equipment-mage-grimoire',
    name: 'Grimoire',
    type: 'equipment',
    rarity: 'rare',
    description: '+10% XP from reading',
    icon: '📕',
    slot: 'focus',
    set: 'mage',
    effect: { type: 'xp_boost', value: 10 },
  },
  {
    id: 'equipment-mage-orb',
    name: 'Crystal Orb',
    type: 'equipment',
    rarity: 'rare',
    description: '+2 credits per level',
    icon: '🔮',
    slot: 'tool',
    set: 'mage',
    effect: { type: 'credit_bonus', value: 2 },
  },
  {
    id: 'equipment-mage-amulet',
    name: 'Amulet',
    type: 'equipment',
    rarity: 'rare',
    description: '+10% milestone acceleration',
    icon: '📿',
    slot: 'charm',
    set: 'mage',
    effect: { type: 'milestone_acceleration', value: 10 },
  },

  // Rogue Set (Level 20)
  {
    id: 'equipment-rogue-deck',
    name: 'Marked Deck',
    type: 'equipment',
    rarity: 'legendary',
    description: '+10% rare drop chance',
    icon: '🃏',
    slot: 'focus',
    set: 'rogue',
    effect: { type: 'loot_luck_rare', value: 10 },
  },
  {
    id: 'equipment-rogue-lockpicks',
    name: 'Lockpicks',
    type: 'equipment',
    rarity: 'legendary',
    description: '+5% legendary drop chance',
    icon: '🔧',
    slot: 'tool',
    set: 'rogue',
    effect: { type: 'loot_luck_legendary', value: 5 },
  },
  {
    id: 'equipment-rogue-coin',
    name: 'Lucky Coin',
    type: 'equipment',
    rarity: 'legendary',
    description: '+1 loot box per week',
    icon: '🪙',
    slot: 'charm',
    set: 'rogue',
    effect: { type: 'loot_generation', value: 1 },
  },
];

// === HELPER FUNCTIONS ===

const ALL_ITEMS = [...CONSUMABLES, ...EQUIPMENT];

export function getItemById(id: string): Item | undefined {
  return ALL_ITEMS.find(item => item.id === id);
}

export function getEquipmentBySet(set: ClassSet): Item[] {
  return EQUIPMENT.filter(item => item.set === set);
}

export function getConsumablesByType(type: 'session' | 'action'): Item[] {
  return CONSUMABLES.filter(item => item.consumableType === type);
}

export function getAllEquipment(): Item[] {
  return EQUIPMENT;
}

export function getAllConsumables(): Item[] {
  return CONSUMABLES;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/itemDefinitions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/itemDefinitions.ts __tests__/lib/itemDefinitions.test.ts
git commit -m "feat: add item and equipment definitions"
```

---

### Task 3: Create Set Bonus Logic

**Files:**
- Create: `lib/setBonus.ts`
- Create: `__tests__/lib/setBonus.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/setBonus.test.ts
import {
  calculateSetBonus,
  getActiveTitle,
  SET_UNLOCK_LEVELS,
  SET_BONUSES,
  TITLE_EFFECTS,
} from '@/lib/setBonus';
import type { PlayerEquipment, Item } from '@/lib/types';

describe('setBonus', () => {
  describe('SET_UNLOCK_LEVELS', () => {
    it('scholar and warrior unlock at level 1', () => {
      expect(SET_UNLOCK_LEVELS.scholar).toBe(1);
      expect(SET_UNLOCK_LEVELS.warrior).toBe(1);
    });

    it('mage unlocks at level 10', () => {
      expect(SET_UNLOCK_LEVELS.mage).toBe(10);
    });

    it('rogue unlocks at level 20', () => {
      expect(SET_UNLOCK_LEVELS.rogue).toBe(20);
    });
  });

  describe('calculateSetBonus', () => {
    const mockScholarFocus: Item = {
      id: 'equipment-scholar-tome',
      name: 'Tome',
      type: 'equipment',
      rarity: 'common',
      description: '',
      icon: '📖',
      slot: 'focus',
      set: 'scholar',
      effect: { type: 'companion_slots', value: 1 },
    };

    const mockScholarTool: Item = {
      id: 'equipment-scholar-quill',
      name: 'Quill',
      type: 'equipment',
      rarity: 'common',
      description: '',
      icon: '🪶',
      slot: 'tool',
      set: 'scholar',
      effect: { type: 'credit_bonus', value: 1 },
    };

    const mockScholarCharm: Item = {
      id: 'equipment-scholar-glasses',
      name: 'Reading Glasses',
      type: 'equipment',
      rarity: 'common',
      description: '',
      icon: '👓',
      slot: 'charm',
      set: 'scholar',
      effect: { type: 'xp_boost', value: 5 },
    };

    it('returns null when no equipment', () => {
      const equipment: PlayerEquipment = {
        focus: null,
        tool: null,
        charm: null,
        collectible: null,
      };
      expect(calculateSetBonus(equipment)).toBeNull();
    });

    it('returns null with only 1 piece', () => {
      const equipment: PlayerEquipment = {
        focus: mockScholarFocus,
        tool: null,
        charm: null,
        collectible: null,
      };
      expect(calculateSetBonus(equipment)).toBeNull();
    });

    it('returns 2-piece bonus with 2 matching pieces', () => {
      const equipment: PlayerEquipment = {
        focus: mockScholarFocus,
        tool: mockScholarTool,
        charm: null,
        collectible: null,
      };
      const bonus = calculateSetBonus(equipment);
      expect(bonus).toBeDefined();
      expect(bonus?.set).toBe('scholar');
      expect(bonus?.pieces).toBe(2);
      expect(bonus?.bonus).toEqual(SET_BONUSES.scholar[2]);
    });

    it('returns 3-piece bonus with full set', () => {
      const equipment: PlayerEquipment = {
        focus: mockScholarFocus,
        tool: mockScholarTool,
        charm: mockScholarCharm,
        collectible: null,
      };
      const bonus = calculateSetBonus(equipment);
      expect(bonus?.pieces).toBe(3);
      expect(bonus?.title).toBeDefined();
    });

    it('returns null with mixed sets', () => {
      const equipment: PlayerEquipment = {
        focus: mockScholarFocus,
        tool: { ...mockScholarTool, set: 'warrior' },
        charm: { ...mockScholarCharm, set: 'mage' },
        collectible: null,
      };
      expect(calculateSetBonus(equipment)).toBeNull();
    });
  });

  describe('getActiveTitle', () => {
    it('returns title for full set', () => {
      const equipment: PlayerEquipment = {
        focus: { id: 't', name: 'T', type: 'equipment', rarity: 'common', description: '', icon: '', slot: 'focus', set: 'scholar' },
        tool: { id: 't2', name: 'T2', type: 'equipment', rarity: 'common', description: '', icon: '', slot: 'tool', set: 'scholar' },
        charm: { id: 't3', name: 'T3', type: 'equipment', rarity: 'common', description: '', icon: '', slot: 'charm', set: 'scholar' },
        collectible: null,
      };
      const title = getActiveTitle(equipment);
      expect(title).toBe('Scholar');
    });

    it('returns null for partial set', () => {
      const equipment: PlayerEquipment = {
        focus: { id: 't', name: 'T', type: 'equipment', rarity: 'common', description: '', icon: '', slot: 'focus', set: 'scholar' },
        tool: { id: 't2', name: 'T2', type: 'equipment', rarity: 'common', description: '', icon: '', slot: 'tool', set: 'scholar' },
        charm: null,
        collectible: null,
      };
      expect(getActiveTitle(equipment)).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/setBonus.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write implementation**

```typescript
// lib/setBonus.ts
import type { PlayerEquipment, ClassSet, ItemEffect } from './types';

export const SET_UNLOCK_LEVELS: Record<ClassSet, number> = {
  scholar: 1,
  warrior: 1,
  mage: 10,
  rogue: 20,
};

export const SET_BONUSES: Record<ClassSet, Record<2 | 3, ItemEffect>> = {
  scholar: {
    2: { type: 'credit_bonus', value: 1 },
    3: { type: 'companion_slots', value: 2 },
  },
  warrior: {
    2: { type: 'xp_boost', value: 5 },
    3: { type: 'streak_protection', value: 2 },
  },
  mage: {
    2: { type: 'xp_boost', value: 10 },
    3: { type: 'xp_boost', value: 20 },
  },
  rogue: {
    2: { type: 'loot_luck_rare', value: 10 },
    3: { type: 'loot_luck_legendary', value: 15 },
  },
};

export const TITLE_NAMES: Record<ClassSet, string> = {
  scholar: 'Scholar',
  warrior: 'Warrior',
  mage: 'Mage',
  rogue: 'Rogue',
};

export const TITLE_EFFECTS: Record<ClassSet, ItemEffect> = {
  scholar: { type: 'credit_bonus', value: 2 },
  warrior: { type: 'streak_protection', value: 1 },
  mage: { type: 'xp_boost', value: 10 },
  rogue: { type: 'loot_generation', value: 1 },
};

export interface SetBonusResult {
  set: ClassSet;
  pieces: 2 | 3;
  bonus: ItemEffect;
  title?: string;
  titleEffect?: ItemEffect;
}

export function calculateSetBonus(equipment: PlayerEquipment): SetBonusResult | null {
  const equipped = [equipment.focus, equipment.tool, equipment.charm].filter(
    (item): item is NonNullable<typeof item> => item !== null
  );

  if (equipped.length < 2) {
    return null;
  }

  // Count pieces per set
  const setCounts: Partial<Record<ClassSet, number>> = {};
  for (const item of equipped) {
    if (item.set) {
      setCounts[item.set] = (setCounts[item.set] || 0) + 1;
    }
  }

  // Find the set with most pieces (minimum 2)
  let bestSet: ClassSet | null = null;
  let bestCount = 0;

  for (const [set, count] of Object.entries(setCounts) as [ClassSet, number][]) {
    if (count >= 2 && count > bestCount) {
      bestSet = set;
      bestCount = count;
    }
  }

  if (!bestSet || bestCount < 2) {
    return null;
  }

  const pieces = bestCount as 2 | 3;
  const result: SetBonusResult = {
    set: bestSet,
    pieces,
    bonus: SET_BONUSES[bestSet][pieces >= 3 ? 3 : 2],
  };

  if (pieces === 3) {
    result.title = TITLE_NAMES[bestSet];
    result.titleEffect = TITLE_EFFECTS[bestSet];
  }

  return result;
}

export function getActiveTitle(equipment: PlayerEquipment): string | null {
  const bonus = calculateSetBonus(equipment);
  return bonus?.title || null;
}

export function isSetUnlocked(set: ClassSet, level: number): boolean {
  return level >= SET_UNLOCK_LEVELS[set];
}

export function getUnlockedSets(level: number): ClassSet[] {
  return (Object.entries(SET_UNLOCK_LEVELS) as [ClassSet, number][])
    .filter(([_, requiredLevel]) => level >= requiredLevel)
    .map(([set]) => set);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/setBonus.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/setBonus.ts __tests__/lib/setBonus.test.ts
git commit -m "feat: add set bonus calculation logic"
```

---

### Task 4: Update Storage Default Progress

**Files:**
- Modify: `lib/storage.ts`
- Modify: `__tests__/lib/storage.test.ts`

**Step 1: Write failing test**

Add to `__tests__/lib/storage.test.ts`:

```typescript
describe('storage v2 fields', () => {
  it('getProgress returns default reward system v2 fields', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const progress = await storage.getProgress();

    expect(progress.credits).toBe(0);
    expect(progress.inventory).toEqual([]);
    expect(progress.equipment).toEqual({
      focus: null,
      tool: null,
      charm: null,
      collectible: null,
    });
    expect(progress.setProgress).toEqual([]);
    expect(progress.activeConsumables).toEqual({
      session: null,
      action: { loot_box: null, streak: null, milestone: null },
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/storage.test.ts`
Expected: FAIL with property undefined errors

**Step 3: Write implementation**

Update `defaultProgress` in `lib/storage.ts`:

```typescript
const defaultProgress: UserProgress = {
  totalXp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastReadDate: null,
  lootItems: [],
  lootBoxes: {
    availableBoxes: [],
    openHistory: [],
  },
  booksFinished: 0,
  booksAdded: 0,
  totalHoursRead: 0,
  // Reward system v2 fields
  credits: 0,
  inventory: [],
  equipment: {
    focus: null,
    tool: null,
    charm: null,
    collectible: null,
  },
  setProgress: [],
  activeConsumables: {
    session: null,
    action: {
      loot_box: null,
      streak: null,
      milestone: null,
    },
  },
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/storage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/storage.ts __tests__/lib/storage.test.ts
git commit -m "feat: add reward system v2 defaults to storage"
```

---

### Task 5: Add Migration for Existing Users

**Files:**
- Modify: `lib/migrations.ts`
- Modify: `__tests__/lib/migrations.test.ts`

**Step 1: Write failing test**

Add to `__tests__/lib/migrations.test.ts`:

```typescript
describe('migration v2 -> v3', () => {
  it('adds reward system v2 fields to progress', async () => {
    const oldProgress = {
      version: 2,
      totalXp: 5000,
      level: 6,
      currentStreak: 5,
      longestStreak: 10,
      lastReadDate: '2026-01-27',
      lootItems: [],
      lootBoxes: { availableBoxes: [], openHistory: [] },
      booksFinished: 3,
      booksAdded: 5,
      totalHoursRead: 25,
    };

    const { progress } = await migrateData([], oldProgress);

    expect(progress.version).toBe(3);
    expect(progress.credits).toBe(5); // level - 1 retroactive credits
    expect(progress.inventory).toEqual([]);
    expect(progress.equipment).toEqual({
      focus: null,
      tool: null,
      charm: null,
      collectible: null,
    });
    expect(progress.setProgress).toEqual([
      { set: 'scholar', unlockedAt: 1, itemsInPool: 1, itemsOwned: [] },
      { set: 'warrior', unlockedAt: 1, itemsInPool: 1, itemsOwned: [] },
    ]);
  });

  it('unlocks mage set for level 10+ users', async () => {
    const oldProgress = {
      version: 2,
      totalXp: 15000,
      level: 16,
      currentStreak: 0,
      longestStreak: 0,
      lastReadDate: null,
      lootItems: [],
      lootBoxes: { availableBoxes: [], openHistory: [] },
      booksFinished: 0,
      booksAdded: 0,
      totalHoursRead: 0,
    };

    const { progress } = await migrateData([], oldProgress);

    expect(progress.setProgress.some(s => s.set === 'mage')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/migrations.test.ts`
Expected: FAIL

**Step 3: Write implementation**

Update `lib/migrations.ts`:

```typescript
import type { Book, UserProgress, Companion, SetProgress, ClassSet } from './types';
import { SET_UNLOCK_LEVELS } from './setBonus';

export const CURRENT_VERSION = 3;

export async function migrateData(
  books: Book[],
  progress: UserProgress & { version?: number }
): Promise<{ books: Book[]; progress: UserProgress & { version: number } }> {
  let version = progress.version || 1;
  let migratedBooks = books;
  let migratedProgress = progress;

  // Migration v1 -> v2: Add companion collection fields
  if (version < 2) {
    // ... existing v1->v2 migration code unchanged ...
    migratedBooks = books.map(book => {
      // @ts-ignore - accessing legacy companion field
      if (book.companion && !book.companions) {
        // @ts-ignore - legacy companion structure
        const legacy = book.companion;

        const legacyCompanion: Companion = {
          id: legacy.id || `${book.id}-legacy-companion`,
          bookId: book.id,
          name: legacy.creature || 'Companion',
          type: 'creature',
          rarity: 'legendary',
          description: `A ${legacy.archetype || 'mysterious'} companion`,
          traits: legacy.keywords?.join(', ') || '',
          visualDescription: legacy.keywords?.join(', ') || '',
          imageUrl: legacy.imageUrl || null,
          source: 'inspired',
          unlockMethod: 'reading_time',
          unlockedAt: legacy.generatedAt || Date.now(),
        };

        return {
          ...book,
          companions: {
            researchComplete: true,
            researchConfidence: 'low' as const,
            readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
            poolQueue: { companions: [], nextGenerateIndex: 0 },
            unlockedCompanions: [legacyCompanion],
          },
        };
      }
      return book;
    });

    migratedProgress = {
      ...migratedProgress,
      lootBoxes: migratedProgress.lootBoxes || { availableBoxes: [], openHistory: [] },
      booksFinished: migratedProgress.booksFinished ?? 0,
      booksAdded: migratedProgress.booksAdded ?? migratedBooks.length,
      totalHoursRead: migratedProgress.totalHoursRead ?? 0,
    };

    version = 2;
  }

  // Migration v2 -> v3: Add reward system v2 fields
  if (version < 3) {
    const level = migratedProgress.level || 1;

    // Calculate retroactive credits (1 per level above 1)
    const retroactiveCredits = Math.max(0, level - 1);

    // Determine which sets should be unlocked based on level
    const setProgress: SetProgress[] = [];
    for (const [set, requiredLevel] of Object.entries(SET_UNLOCK_LEVELS) as [ClassSet, number][]) {
      if (level >= requiredLevel) {
        setProgress.push({
          set,
          unlockedAt: requiredLevel,
          itemsInPool: 1, // First item available
          itemsOwned: [],
        });
      }
    }

    migratedProgress = {
      ...migratedProgress,
      credits: retroactiveCredits,
      inventory: [],
      equipment: {
        focus: null,
        tool: null,
        charm: null,
        collectible: null,
      },
      setProgress,
      activeConsumables: {
        session: null,
        action: {
          loot_box: null,
          streak: null,
          milestone: null,
        },
      },
    };

    version = 3;
  }

  return {
    books: migratedBooks,
    progress: { ...migratedProgress, version },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/migrations.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/migrations.ts __tests__/lib/migrations.test.ts
git commit -m "feat: add v3 migration for reward system v2 fields"
```

---

## Phase 2: Equipment & Inventory Logic

### Task 6: Create Equipment Management Module

**Files:**
- Create: `lib/equipment.ts`
- Create: `__tests__/lib/equipment.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/equipment.test.ts
import {
  equipItem,
  unequipItem,
  canEquipItem,
  getEquippedItems,
  getTotalEffects,
} from '@/lib/equipment';
import type { PlayerEquipment, Item, ItemEffect } from '@/lib/types';

describe('equipment', () => {
  const mockFocusItem: Item = {
    id: 'equipment-scholar-tome',
    name: 'Tome',
    type: 'equipment',
    rarity: 'common',
    description: '+1 companion slot',
    icon: '📖',
    slot: 'focus',
    set: 'scholar',
    effect: { type: 'companion_slots', value: 1 },
  };

  const mockToolItem: Item = {
    id: 'equipment-scholar-quill',
    name: 'Quill',
    type: 'equipment',
    rarity: 'common',
    description: '+1 credit per level',
    icon: '🪶',
    slot: 'tool',
    set: 'scholar',
    effect: { type: 'credit_bonus', value: 1 },
  };

  describe('equipItem', () => {
    it('equips item to correct slot', () => {
      const equipment: PlayerEquipment = {
        focus: null,
        tool: null,
        charm: null,
        collectible: null,
      };

      const result = equipItem(equipment, mockFocusItem);

      expect(result.equipment.focus).toEqual(mockFocusItem);
      expect(result.previousItem).toBeNull();
    });

    it('returns previous item when replacing', () => {
      const equipment: PlayerEquipment = {
        focus: mockFocusItem,
        tool: null,
        charm: null,
        collectible: null,
      };

      const newItem = { ...mockFocusItem, id: 'new-item', name: 'New Tome' };
      const result = equipItem(equipment, newItem);

      expect(result.equipment.focus).toEqual(newItem);
      expect(result.previousItem).toEqual(mockFocusItem);
    });

    it('throws for item without slot', () => {
      const equipment: PlayerEquipment = {
        focus: null,
        tool: null,
        charm: null,
        collectible: null,
      };

      const consumable: Item = {
        id: 'consumable',
        name: 'Potion',
        type: 'consumable',
        rarity: 'common',
        description: '',
        icon: '',
      };

      expect(() => equipItem(equipment, consumable)).toThrow();
    });
  });

  describe('unequipItem', () => {
    it('removes item from slot', () => {
      const equipment: PlayerEquipment = {
        focus: mockFocusItem,
        tool: null,
        charm: null,
        collectible: null,
      };

      const result = unequipItem(equipment, 'focus');

      expect(result.equipment.focus).toBeNull();
      expect(result.removedItem).toEqual(mockFocusItem);
    });

    it('returns null when slot empty', () => {
      const equipment: PlayerEquipment = {
        focus: null,
        tool: null,
        charm: null,
        collectible: null,
      };

      const result = unequipItem(equipment, 'focus');

      expect(result.removedItem).toBeNull();
    });
  });

  describe('canEquipItem', () => {
    it('returns true for equipment with matching slot', () => {
      expect(canEquipItem(mockFocusItem)).toBe(true);
    });

    it('returns false for consumables', () => {
      const consumable: Item = {
        id: 'c',
        name: 'C',
        type: 'consumable',
        rarity: 'common',
        description: '',
        icon: '',
      };
      expect(canEquipItem(consumable)).toBe(false);
    });
  });

  describe('getTotalEffects', () => {
    it('aggregates effects from all equipped items', () => {
      const equipment: PlayerEquipment = {
        focus: mockFocusItem,
        tool: mockToolItem,
        charm: null,
        collectible: null,
      };

      const effects = getTotalEffects(equipment);

      expect(effects.companion_slots).toBe(1);
      expect(effects.credit_bonus).toBe(1);
    });

    it('returns empty object for no equipment', () => {
      const equipment: PlayerEquipment = {
        focus: null,
        tool: null,
        charm: null,
        collectible: null,
      };

      const effects = getTotalEffects(equipment);

      expect(Object.keys(effects)).toHaveLength(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/equipment.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write implementation**

```typescript
// lib/equipment.ts
import type { PlayerEquipment, Item, ItemSlot, ItemEffectType } from './types';

export interface EquipResult {
  equipment: PlayerEquipment;
  previousItem: Item | null;
}

export interface UnequipResult {
  equipment: PlayerEquipment;
  removedItem: Item | null;
}

export function equipItem(equipment: PlayerEquipment, item: Item): EquipResult {
  if (!item.slot) {
    throw new Error('Cannot equip item without slot');
  }

  const slot = item.slot as keyof Pick<PlayerEquipment, 'focus' | 'tool' | 'charm'>;
  const previousItem = equipment[slot];

  return {
    equipment: {
      ...equipment,
      [slot]: item,
    },
    previousItem,
  };
}

export function unequipItem(
  equipment: PlayerEquipment,
  slot: ItemSlot
): UnequipResult {
  const removedItem = equipment[slot];

  return {
    equipment: {
      ...equipment,
      [slot]: null,
    },
    removedItem,
  };
}

export function canEquipItem(item: Item): boolean {
  return item.type === 'equipment' && !!item.slot;
}

export function getEquippedItems(equipment: PlayerEquipment): Item[] {
  return [equipment.focus, equipment.tool, equipment.charm, equipment.collectible].filter(
    (item): item is Item => item !== null
  );
}

export type EffectTotals = Partial<Record<ItemEffectType, number>>;

export function getTotalEffects(equipment: PlayerEquipment): EffectTotals {
  const totals: EffectTotals = {};

  const items = getEquippedItems(equipment);
  for (const item of items) {
    if (item.effect) {
      totals[item.effect.type] = (totals[item.effect.type] || 0) + item.effect.value;
    }
  }

  return totals;
}

export function getEffectValue(equipment: PlayerEquipment, effectType: ItemEffectType): number {
  const totals = getTotalEffects(equipment);
  return totals[effectType] || 0;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/equipment.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/equipment.ts __tests__/lib/equipment.test.ts
git commit -m "feat: add equipment management module"
```

---

### Task 7: Create Inventory Management Module

**Files:**
- Create: `lib/inventory.ts`
- Create: `__tests__/lib/inventory.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/inventory.test.ts
import {
  addItemToInventory,
  removeItemFromInventory,
  getInventoryByType,
  hasItem,
  countItemsByRarity,
} from '@/lib/inventory';
import type { Item } from '@/lib/types';

describe('inventory', () => {
  const mockItem: Item = {
    id: 'test-item-1',
    name: 'Test Item',
    type: 'equipment',
    rarity: 'common',
    description: 'Test',
    icon: '📖',
    slot: 'focus',
    set: 'scholar',
  };

  describe('addItemToInventory', () => {
    it('adds item to empty inventory', () => {
      const result = addItemToInventory([], mockItem);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockItem);
    });

    it('adds item to existing inventory', () => {
      const existing = [mockItem];
      const newItem = { ...mockItem, id: 'test-item-2' };
      const result = addItemToInventory(existing, newItem);
      expect(result).toHaveLength(2);
    });

    it('does not duplicate existing item', () => {
      const result = addItemToInventory([mockItem], mockItem);
      expect(result).toHaveLength(1);
    });
  });

  describe('removeItemFromInventory', () => {
    it('removes item by id', () => {
      const result = removeItemFromInventory([mockItem], 'test-item-1');
      expect(result).toHaveLength(0);
    });

    it('returns unchanged array if item not found', () => {
      const result = removeItemFromInventory([mockItem], 'nonexistent');
      expect(result).toHaveLength(1);
    });
  });

  describe('getInventoryByType', () => {
    it('filters by item type', () => {
      const items: Item[] = [
        mockItem,
        { ...mockItem, id: 'c1', type: 'consumable' },
        { ...mockItem, id: 'c2', type: 'consumable' },
      ];
      const consumables = getInventoryByType(items, 'consumable');
      expect(consumables).toHaveLength(2);
    });
  });

  describe('hasItem', () => {
    it('returns true when item exists', () => {
      expect(hasItem([mockItem], 'test-item-1')).toBe(true);
    });

    it('returns false when item does not exist', () => {
      expect(hasItem([mockItem], 'nonexistent')).toBe(false);
    });
  });

  describe('countItemsByRarity', () => {
    it('counts items by rarity', () => {
      const items: Item[] = [
        { ...mockItem, id: 'c1', rarity: 'common' },
        { ...mockItem, id: 'c2', rarity: 'common' },
        { ...mockItem, id: 'r1', rarity: 'rare' },
        { ...mockItem, id: 'l1', rarity: 'legendary' },
      ];
      const counts = countItemsByRarity(items);
      expect(counts.common).toBe(2);
      expect(counts.rare).toBe(1);
      expect(counts.legendary).toBe(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/inventory.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write implementation**

```typescript
// lib/inventory.ts
import type { Item, ItemType, ItemRarity } from './types';

export function addItemToInventory(inventory: Item[], item: Item): Item[] {
  // Don't add duplicates
  if (inventory.some(i => i.id === item.id)) {
    return inventory;
  }
  return [...inventory, item];
}

export function removeItemFromInventory(inventory: Item[], itemId: string): Item[] {
  return inventory.filter(item => item.id !== itemId);
}

export function getInventoryByType(inventory: Item[], type: ItemType): Item[] {
  return inventory.filter(item => item.type === type);
}

export function hasItem(inventory: Item[], itemId: string): boolean {
  return inventory.some(item => item.id === itemId);
}

export function countItemsByRarity(inventory: Item[]): Record<ItemRarity, number> {
  const counts: Record<ItemRarity, number> = {
    common: 0,
    rare: 0,
    legendary: 0,
  };

  for (const item of inventory) {
    counts[item.rarity]++;
  }

  return counts;
}

export function getItemById(inventory: Item[], itemId: string): Item | undefined {
  return inventory.find(item => item.id === itemId);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/inventory.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/inventory.ts __tests__/lib/inventory.test.ts
git commit -m "feat: add inventory management module"
```

---

### Task 8: Create Credits Module

**Files:**
- Create: `lib/credits.ts`
- Create: `__tests__/lib/credits.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/credits.test.ts
import {
  calculateCreditsForLevelUp,
  canAfford,
  spendCredits,
  SHOP_PRICES,
} from '@/lib/credits';

describe('credits', () => {
  describe('calculateCreditsForLevelUp', () => {
    it('grants base 1 credit per level', () => {
      const credits = calculateCreditsForLevelUp(1, 2, 0);
      expect(credits).toBe(1);
    });

    it('grants bonus credits from equipment', () => {
      const credits = calculateCreditsForLevelUp(1, 2, 2); // +2 credit bonus from equipment
      expect(credits).toBe(3);
    });

    it('grants credits for multiple level ups', () => {
      const credits = calculateCreditsForLevelUp(1, 5, 0);
      expect(credits).toBe(4); // levels 2, 3, 4, 5
    });
  });

  describe('canAfford', () => {
    it('returns true when enough credits', () => {
      expect(canAfford(10, 5)).toBe(true);
    });

    it('returns false when not enough credits', () => {
      expect(canAfford(3, 5)).toBe(false);
    });

    it('returns true when exact amount', () => {
      expect(canAfford(5, 5)).toBe(true);
    });
  });

  describe('spendCredits', () => {
    it('deducts credits', () => {
      expect(spendCredits(10, 3)).toBe(7);
    });

    it('throws when insufficient credits', () => {
      expect(() => spendCredits(2, 5)).toThrow();
    });
  });

  describe('SHOP_PRICES', () => {
    it('has prices for consumables', () => {
      expect(SHOP_PRICES['consumable-focus-candle']).toBeDefined();
      expect(SHOP_PRICES['consumable-focus-candle']).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/credits.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write implementation**

```typescript
// lib/credits.ts

export const SHOP_PRICES: Record<string, number> = {
  // Common consumables
  'consumable-focus-candle': 2,
  'consumable-lucky-coin': 2,
  // Rare consumables
  'consumable-scholars-incense': 5,
  'consumable-rabbits-foot': 5,
  'consumable-streak-shield': 5,
  // Legendary consumables
  'consumable-arcane-flame': 10,
  'consumable-dragons-eye': 10,
  'consumable-time-crystal': 10,
};

export function calculateCreditsForLevelUp(
  previousLevel: number,
  newLevel: number,
  creditBonus: number
): number {
  const levelsGained = newLevel - previousLevel;
  const baseCredits = levelsGained;
  const bonusCredits = levelsGained * creditBonus;
  return baseCredits + bonusCredits;
}

export function canAfford(currentCredits: number, cost: number): boolean {
  return currentCredits >= cost;
}

export function spendCredits(currentCredits: number, cost: number): number {
  if (!canAfford(currentCredits, cost)) {
    throw new Error('Insufficient credits');
  }
  return currentCredits - cost;
}

export function getShopPrice(itemId: string): number | undefined {
  return SHOP_PRICES[itemId];
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/credits.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/credits.ts __tests__/lib/credits.test.ts
git commit -m "feat: add credits management module"
```

---

## Phase 3: Loot Box Integration

### Task 9: Update Loot Box to Drop Items

**Files:**
- Modify: `lib/lootBox.ts`
- Modify: `__tests__/lib/lootBox.test.ts`

**Step 1: Write failing test**

Add to `__tests__/lib/lootBox.test.ts`:

```typescript
import { rollItemDrop, getAvailableItemPool } from '@/lib/lootBox';
import type { SetProgress } from '@/lib/types';

describe('item drops', () => {
  describe('getAvailableItemPool', () => {
    it('returns items from unlocked sets only', () => {
      const setProgress: SetProgress[] = [
        { set: 'scholar', unlockedAt: 1, itemsInPool: 2, itemsOwned: [] },
        { set: 'warrior', unlockedAt: 1, itemsInPool: 1, itemsOwned: [] },
      ];

      const pool = getAvailableItemPool(setProgress);

      expect(pool.some(i => i.set === 'scholar')).toBe(true);
      expect(pool.some(i => i.set === 'warrior')).toBe(true);
      expect(pool.some(i => i.set === 'mage')).toBe(false);
    });

    it('excludes already owned items', () => {
      const setProgress: SetProgress[] = [
        { set: 'scholar', unlockedAt: 1, itemsInPool: 3, itemsOwned: ['equipment-scholar-tome'] },
      ];

      const pool = getAvailableItemPool(setProgress);

      expect(pool.some(i => i.id === 'equipment-scholar-tome')).toBe(false);
    });

    it('respects itemsInPool limit', () => {
      const setProgress: SetProgress[] = [
        { set: 'scholar', unlockedAt: 1, itemsInPool: 1, itemsOwned: [] },
      ];

      const pool = getAvailableItemPool(setProgress);

      // Only 1 item should be in pool
      const scholarItems = pool.filter(i => i.set === 'scholar');
      expect(scholarItems.length).toBe(1);
    });
  });

  describe('rollItemDrop', () => {
    it('returns item from pool', () => {
      const setProgress: SetProgress[] = [
        { set: 'scholar', unlockedAt: 1, itemsInPool: 3, itemsOwned: [] },
      ];

      const result = rollItemDrop(setProgress, { rareBonus: 0, legendaryBonus: 0 });

      expect(result).toBeDefined();
      expect(result?.type).toBe('equipment');
    });

    it('returns null when pool is empty', () => {
      const result = rollItemDrop([], { rareBonus: 0, legendaryBonus: 0 });
      expect(result).toBeNull();
    });

    it('can also drop consumables', () => {
      const setProgress: SetProgress[] = [
        { set: 'scholar', unlockedAt: 1, itemsInPool: 3, itemsOwned: [] },
      ];

      // Run many times to verify consumables can drop
      let foundConsumable = false;
      for (let i = 0; i < 100; i++) {
        const result = rollItemDrop(setProgress, { rareBonus: 0, legendaryBonus: 0 });
        if (result?.type === 'consumable') {
          foundConsumable = true;
          break;
        }
      }

      expect(foundConsumable).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/lootBox.test.ts`
Expected: FAIL with undefined function errors

**Step 3: Write implementation**

Add to `lib/lootBox.ts`:

```typescript
import { EQUIPMENT, CONSUMABLES, getEquipmentBySet } from './itemDefinitions';
import type { Item, SetProgress, ClassSet } from './types';

// Item drop weights
const DROP_TYPE_WEIGHTS = {
  equipment: 60, // 60% chance for equipment
  consumable: 40, // 40% chance for consumable
};

const RARITY_WEIGHTS = {
  common: 60,
  rare: 25,
  legendary: 15,
};

export interface LuckBonus {
  rareBonus: number;
  legendaryBonus: number;
}

export function getAvailableItemPool(setProgress: SetProgress[]): Item[] {
  const pool: Item[] = [];

  for (const progress of setProgress) {
    const setItems = getEquipmentBySet(progress.set);

    // Only include items up to itemsInPool count, excluding owned
    let addedCount = 0;
    for (const item of setItems) {
      if (addedCount >= progress.itemsInPool) break;
      if (!progress.itemsOwned.includes(item.id)) {
        pool.push(item);
        addedCount++;
      }
    }
  }

  return pool;
}

export function rollItemDrop(
  setProgress: SetProgress[],
  luck: LuckBonus
): Item | null {
  // Decide if equipment or consumable
  const typeRoll = Math.random() * 100;
  const isEquipment = typeRoll < DROP_TYPE_WEIGHTS.equipment;

  if (isEquipment) {
    // Roll from equipment pool
    const pool = getAvailableItemPool(setProgress);
    if (pool.length === 0) {
      // Fall back to consumable if no equipment available
      return rollConsumable(luck);
    }

    // Apply rarity weighting with luck bonus
    return rollFromPoolWithRarity(pool, luck);
  } else {
    return rollConsumable(luck);
  }
}

function rollConsumable(luck: LuckBonus): Item {
  return rollFromPoolWithRarity(CONSUMABLES, luck);
}

function rollFromPoolWithRarity(pool: Item[], luck: LuckBonus): Item {
  // Adjust rarity weights with luck
  const adjustedWeights = {
    common: Math.max(0, RARITY_WEIGHTS.common - luck.rareBonus - luck.legendaryBonus),
    rare: RARITY_WEIGHTS.rare + luck.rareBonus,
    legendary: RARITY_WEIGHTS.legendary + luck.legendaryBonus,
  };

  const total = adjustedWeights.common + adjustedWeights.rare + adjustedWeights.legendary;
  const roll = Math.random() * total;

  let targetRarity: 'common' | 'rare' | 'legendary';
  if (roll < adjustedWeights.legendary) {
    targetRarity = 'legendary';
  } else if (roll < adjustedWeights.legendary + adjustedWeights.rare) {
    targetRarity = 'rare';
  } else {
    targetRarity = 'common';
  }

  // Filter pool by rarity
  const rarityPool = pool.filter(item => item.rarity === targetRarity);

  // If no items of that rarity, fall back to any rarity
  const finalPool = rarityPool.length > 0 ? rarityPool : pool;

  // Random selection
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/lootBox.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/lootBox.ts __tests__/lib/lootBox.test.ts
git commit -m "feat: add item drops to loot box system"
```

---

### Task 10: Add Set Progress Advancement

**Files:**
- Create: `lib/setProgress.ts`
- Create: `__tests__/lib/setProgress.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/setProgress.test.ts
import {
  advanceSetProgress,
  checkSetUnlocks,
  initializeSetProgress,
} from '@/lib/setProgress';
import type { SetProgress, Item } from '@/lib/types';

describe('setProgress', () => {
  describe('initializeSetProgress', () => {
    it('creates progress for level 1 user', () => {
      const progress = initializeSetProgress(1);

      expect(progress.some(s => s.set === 'scholar')).toBe(true);
      expect(progress.some(s => s.set === 'warrior')).toBe(true);
      expect(progress.some(s => s.set === 'mage')).toBe(false);
    });

    it('creates progress for level 15 user', () => {
      const progress = initializeSetProgress(15);

      expect(progress.some(s => s.set === 'mage')).toBe(true);
      expect(progress.some(s => s.set === 'rogue')).toBe(false);
    });
  });

  describe('checkSetUnlocks', () => {
    it('returns newly unlocked sets', () => {
      const current: SetProgress[] = [
        { set: 'scholar', unlockedAt: 1, itemsInPool: 3, itemsOwned: [] },
      ];

      const unlocks = checkSetUnlocks(current, 9, 10);

      expect(unlocks).toContain('mage');
    });

    it('returns empty when no new unlocks', () => {
      const current: SetProgress[] = [
        { set: 'scholar', unlockedAt: 1, itemsInPool: 3, itemsOwned: [] },
      ];

      const unlocks = checkSetUnlocks(current, 5, 6);

      expect(unlocks).toHaveLength(0);
    });
  });

  describe('advanceSetProgress', () => {
    it('adds owned item and advances pool', () => {
      const progress: SetProgress[] = [
        { set: 'scholar', unlockedAt: 1, itemsInPool: 1, itemsOwned: [] },
      ];

      const item: Item = {
        id: 'equipment-scholar-tome',
        name: 'Tome',
        type: 'equipment',
        rarity: 'common',
        description: '',
        icon: '',
        slot: 'focus',
        set: 'scholar',
      };

      const updated = advanceSetProgress(progress, item);

      expect(updated[0].itemsOwned).toContain('equipment-scholar-tome');
      expect(updated[0].itemsInPool).toBe(2);
    });

    it('caps itemsInPool at 3', () => {
      const progress: SetProgress[] = [
        { set: 'scholar', unlockedAt: 1, itemsInPool: 3, itemsOwned: ['a', 'b'] },
      ];

      const item: Item = {
        id: 'equipment-scholar-glasses',
        name: 'Glasses',
        type: 'equipment',
        rarity: 'common',
        description: '',
        icon: '',
        slot: 'charm',
        set: 'scholar',
      };

      const updated = advanceSetProgress(progress, item);

      expect(updated[0].itemsInPool).toBe(3);
      expect(updated[0].itemsOwned).toHaveLength(3);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/setProgress.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write implementation**

```typescript
// lib/setProgress.ts
import type { SetProgress, Item, ClassSet } from './types';
import { SET_UNLOCK_LEVELS } from './setBonus';

const MAX_ITEMS_PER_SET = 3;

export function initializeSetProgress(level: number): SetProgress[] {
  const progress: SetProgress[] = [];

  for (const [set, requiredLevel] of Object.entries(SET_UNLOCK_LEVELS) as [ClassSet, number][]) {
    if (level >= requiredLevel) {
      progress.push({
        set,
        unlockedAt: requiredLevel,
        itemsInPool: 1, // First item available
        itemsOwned: [],
      });
    }
  }

  return progress;
}

export function checkSetUnlocks(
  currentProgress: SetProgress[],
  previousLevel: number,
  newLevel: number
): ClassSet[] {
  const newlyUnlocked: ClassSet[] = [];

  for (const [set, requiredLevel] of Object.entries(SET_UNLOCK_LEVELS) as [ClassSet, number][]) {
    const alreadyUnlocked = currentProgress.some(p => p.set === set);
    const wasLocked = previousLevel < requiredLevel;
    const nowUnlocked = newLevel >= requiredLevel;

    if (!alreadyUnlocked && wasLocked && nowUnlocked) {
      newlyUnlocked.push(set);
    }
  }

  return newlyUnlocked;
}

export function addNewSetProgress(
  currentProgress: SetProgress[],
  newSets: ClassSet[]
): SetProgress[] {
  const newProgress = [...currentProgress];

  for (const set of newSets) {
    if (!newProgress.some(p => p.set === set)) {
      newProgress.push({
        set,
        unlockedAt: SET_UNLOCK_LEVELS[set],
        itemsInPool: 1,
        itemsOwned: [],
      });
    }
  }

  return newProgress;
}

export function advanceSetProgress(
  progress: SetProgress[],
  acquiredItem: Item
): SetProgress[] {
  if (!acquiredItem.set) {
    return progress;
  }

  return progress.map(p => {
    if (p.set !== acquiredItem.set) {
      return p;
    }

    // Add item to owned list
    const itemsOwned = [...p.itemsOwned];
    if (!itemsOwned.includes(acquiredItem.id)) {
      itemsOwned.push(acquiredItem.id);
    }

    // Advance items in pool (up to max)
    const itemsInPool = Math.min(p.itemsInPool + 1, MAX_ITEMS_PER_SET);

    return {
      ...p,
      itemsOwned,
      itemsInPool,
    };
  });
}

export function getSetCompletionStatus(progress: SetProgress): {
  owned: number;
  total: number;
  complete: boolean;
} {
  return {
    owned: progress.itemsOwned.length,
    total: MAX_ITEMS_PER_SET,
    complete: progress.itemsOwned.length >= MAX_ITEMS_PER_SET,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/setProgress.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/setProgress.ts __tests__/lib/setProgress.test.ts
git commit -m "feat: add set progress advancement logic"
```

---

## Phase 4: Consumable Usage

### Task 11: Create Consumable Usage Module

**Files:**
- Create: `lib/consumables.ts`
- Create: `__tests__/lib/consumables.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/consumables.test.ts
import {
  activateSessionConsumable,
  activateActionConsumable,
  consumeSessionBuff,
  consumeActionTrigger,
  getActiveSessionBonus,
  getActiveLootLuckBonus,
} from '@/lib/consumables';
import type { ActiveConsumables, Item } from '@/lib/types';

describe('consumables', () => {
  const mockSessionBuff: Item = {
    id: 'consumable-focus-candle',
    name: 'Focus Candle',
    type: 'consumable',
    rarity: 'common',
    description: '+25% XP',
    icon: '🕯️',
    consumableType: 'session',
    effect: { type: 'xp_boost', value: 25 },
  };

  const mockActionTrigger: Item = {
    id: 'consumable-lucky-coin',
    name: 'Lucky Coin',
    type: 'consumable',
    rarity: 'common',
    description: '+15% rare',
    icon: '🪙',
    consumableType: 'action',
    actionTarget: 'loot_box',
    effect: { type: 'loot_luck_rare', value: 15 },
  };

  const emptyConsumables: ActiveConsumables = {
    session: null,
    action: { loot_box: null, streak: null, milestone: null },
  };

  describe('activateSessionConsumable', () => {
    it('activates session consumable', () => {
      const result = activateSessionConsumable(emptyConsumables, mockSessionBuff);
      expect(result.session).toEqual(mockSessionBuff);
    });

    it('replaces existing session consumable', () => {
      const active: ActiveConsumables = { ...emptyConsumables, session: mockSessionBuff };
      const newBuff = { ...mockSessionBuff, id: 'new', name: 'New Buff' };

      const result = activateSessionConsumable(active, newBuff);

      expect(result.session?.id).toBe('new');
    });
  });

  describe('activateActionConsumable', () => {
    it('activates loot box action trigger', () => {
      const result = activateActionConsumable(emptyConsumables, mockActionTrigger);
      expect(result.action.loot_box).toEqual(mockActionTrigger);
    });
  });

  describe('consumeSessionBuff', () => {
    it('clears session buff after use', () => {
      const active: ActiveConsumables = { ...emptyConsumables, session: mockSessionBuff };
      const result = consumeSessionBuff(active);

      expect(result.session).toBeNull();
    });
  });

  describe('consumeActionTrigger', () => {
    it('clears specific action trigger after use', () => {
      const active: ActiveConsumables = {
        ...emptyConsumables,
        action: { ...emptyConsumables.action, loot_box: mockActionTrigger },
      };

      const result = consumeActionTrigger(active, 'loot_box');

      expect(result.action.loot_box).toBeNull();
    });
  });

  describe('getActiveSessionBonus', () => {
    it('returns XP bonus from session buff', () => {
      const active: ActiveConsumables = { ...emptyConsumables, session: mockSessionBuff };
      const bonus = getActiveSessionBonus(active);

      expect(bonus.xpBoost).toBe(25);
    });

    it('returns 0 when no session buff', () => {
      const bonus = getActiveSessionBonus(emptyConsumables);
      expect(bonus.xpBoost).toBe(0);
    });
  });

  describe('getActiveLootLuckBonus', () => {
    it('returns luck bonus from action trigger', () => {
      const active: ActiveConsumables = {
        ...emptyConsumables,
        action: { ...emptyConsumables.action, loot_box: mockActionTrigger },
      };

      const bonus = getActiveLootLuckBonus(active);

      expect(bonus.rareBonus).toBe(15);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/consumables.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write implementation**

```typescript
// lib/consumables.ts
import type { ActiveConsumables, Item } from './types';

export function activateSessionConsumable(
  active: ActiveConsumables,
  consumable: Item
): ActiveConsumables {
  if (consumable.consumableType !== 'session') {
    throw new Error('Not a session consumable');
  }

  return {
    ...active,
    session: consumable,
  };
}

export function activateActionConsumable(
  active: ActiveConsumables,
  consumable: Item
): ActiveConsumables {
  if (consumable.consumableType !== 'action' || !consumable.actionTarget) {
    throw new Error('Not an action consumable');
  }

  return {
    ...active,
    action: {
      ...active.action,
      [consumable.actionTarget]: consumable,
    },
  };
}

export function consumeSessionBuff(active: ActiveConsumables): ActiveConsumables {
  return {
    ...active,
    session: null,
  };
}

export function consumeActionTrigger(
  active: ActiveConsumables,
  target: 'loot_box' | 'streak' | 'milestone'
): ActiveConsumables {
  return {
    ...active,
    action: {
      ...active.action,
      [target]: null,
    },
  };
}

export interface SessionBonus {
  xpBoost: number;
  milestoneAcceleration: number;
}

export function getActiveSessionBonus(active: ActiveConsumables): SessionBonus {
  const bonus: SessionBonus = {
    xpBoost: 0,
    milestoneAcceleration: 0,
  };

  if (active.session?.effect) {
    if (active.session.effect.type === 'xp_boost') {
      bonus.xpBoost = active.session.effect.value;
    }
    if (active.session.effect.type === 'milestone_acceleration') {
      bonus.milestoneAcceleration = active.session.effect.value;
    }
  }

  // Also check milestone action trigger
  if (active.action.milestone?.effect?.type === 'milestone_acceleration') {
    bonus.milestoneAcceleration += active.action.milestone.effect.value;
  }

  return bonus;
}

export interface LootLuckBonus {
  rareBonus: number;
  legendaryBonus: number;
}

export function getActiveLootLuckBonus(active: ActiveConsumables): LootLuckBonus {
  const bonus: LootLuckBonus = {
    rareBonus: 0,
    legendaryBonus: 0,
  };

  const lootConsumable = active.action.loot_box;
  if (!lootConsumable?.effect) {
    return bonus;
  }

  // Parse the effect - Lucky Coin, Rabbit's Foot, Dragon's Eye
  if (lootConsumable.effect.type === 'loot_luck_rare') {
    bonus.rareBonus = lootConsumable.effect.value;

    // Higher tier items also have legendary bonus
    if (lootConsumable.rarity === 'rare') {
      bonus.legendaryBonus = 10;
    } else if (lootConsumable.rarity === 'legendary') {
      bonus.legendaryBonus = 25;
    }
  }

  return bonus;
}

export function hasActiveStreakProtection(active: ActiveConsumables): boolean {
  return active.action.streak !== null;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/consumables.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/consumables.ts __tests__/lib/consumables.test.ts
git commit -m "feat: add consumable usage module"
```

---

## Summary

**Total Tasks:** 11 (Phase 1-4 Core Logic)

**Files Created:**
- `lib/itemDefinitions.ts` - Item and equipment definitions
- `lib/setBonus.ts` - Set bonus calculation
- `lib/equipment.ts` - Equipment management
- `lib/inventory.ts` - Inventory management
- `lib/credits.ts` - Credits system
- `lib/setProgress.ts` - Set unlock progression
- `lib/consumables.ts` - Consumable usage

**Files Modified:**
- `lib/types.ts` - Item system types
- `lib/storage.ts` - Default progress fields
- `lib/migrations.ts` - v3 migration
- `lib/lootBox.ts` - Item drops

**Tests Created:**
- `__tests__/lib/itemTypes.test.ts`
- `__tests__/lib/itemDefinitions.test.ts`
- `__tests__/lib/setBonus.test.ts`
- `__tests__/lib/equipment.test.ts`
- `__tests__/lib/inventory.test.ts`
- `__tests__/lib/credits.test.ts`
- `__tests__/lib/setProgress.test.ts`
- `__tests__/lib/consumables.test.ts`

---

## Future Phases (Not in This Plan)

**Phase 5: UI Screens**
- Inventory screen (`app/inventory.tsx`)
- Equipment screen (`app/equipment.tsx`)
- Shop screen (`app/shop.tsx`)
- Update profile screen with equipment display

**Phase 6: Integration**
- Apply equipment effects to XP calculation
- Apply consumable effects to reading sessions
- Apply loot luck to loot box opening
- Update level-up flow to grant credits

**Phase 7: Polish**
- Animation for item acquisition
- Set completion celebration
- Title display on profile
