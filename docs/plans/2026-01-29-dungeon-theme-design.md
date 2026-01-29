# Dungeon Theme UI Design

A comprehensive visual overhaul using Kenney Tiny Dungeon pixel art assets to transform BlahRead into a dungeon-crawler styled reading tracker.

## Goals

- Create a new "dungeon" theme as the default, keeping light/dark as alternatives
- Use pixel art sprites for loot boxes, consumables, and UI elements
- Maintain monospace typography for the retro-terminal hybrid aesthetic
- Enhance the loot box opening with a progressive reveal experience
- Apply dungeon styling across all screens

## Asset Overview

**Source:** `assets/kenney_tiny-dungeon/Tiles/` (132 tiles, 16x16px each)

**Key Assets Identified:**

| Asset | Tile | Use |
|-------|------|-----|
| Closed chest (wood) | tile_0054 | Wood loot box |
| Closed chest (metal) | tile_0055 | Silver loot box |
| Open chest | tile_0067 | Opened state |
| Red potion | tile_0103 | drop_rate_boost consumable |
| Green potion | tile_0114 | xp_boost consumable |
| Shield | tile_0102 | streak_shield consumable |
| Scroll | tile_0105 | Various consumables |
| Character sprites | tile_0100+ | Companion placeholders |

---

## Theme Architecture

### Color Palette

```typescript
const dungeonTheme = {
  background: '#1a1a1a',      // Deep stone
  surface: '#2d2d2d',         // Stone
  card: '#3a3a3a',            // Light stone
  border: '#4a4a4a',          // Stone edge
  text: '#f5deb3',            // Parchment
  textSecondary: '#c4a574',   // Aged parchment
  textMuted: '#7a6a5a',       // Faded
  accent: '#ffb347',          // Torchlight/amber
  success: '#4a7c4e',         // Dungeon green

  // Rarity colors (unchanged)
  rarityCommon: '#8b4513',    // Wood brown
  rarityRare: '#c0c0c0',      // Silver
  rarityLegendary: '#ffd700', // Gold
};
```

### Theme Integration

- Add `dungeon` as new theme option in `lib/theme.ts`
- Set `dungeon` as default theme
- Preserve `light` and `dark` themes as user options
- Theme selection persisted in settings

### Sprite Scaling Strategy

Tiles are 16x16px. Render at integer scales with `resizeMode="nearest"` (or equivalent `imageRendering: pixelated` for web):

- Small icons: 2x (32px)
- Medium icons: 3x (48px)
- Large/featured: 4x (64px)

---

## Loot Box Progressive Reveal

### Stage Flow

```
[Closed Chest] → tap → [Shake + Open] → [Category Hint] → [Item Reveal]
     500ms              300ms              500ms             final
```

### Stage 1: Chest Display

- Closed chest sprite at 4x scale (64px), centered
- Chest sprite varies by tier:
  - Wood: tile_0054 (wooden chest)
  - Silver: tile_0055 (metal chest)
  - Gold: tile_0055 with gold tint/glow effect
- Text below: `tap to open`
- Background dims to 50% opacity

### Stage 2: Tier Reveal

- Chest sprite oscillates (CSS transform: rotate ±3deg, 3 cycles)
- Swap to open chest sprite (tile_0067)
- Tier label fades in with colored glow:
  - `[wood box]` in brown
  - `[silver box]` in silver
  - `[gold box]` in gold with subtle shimmer

### Stage 3: Category Hint

- Icon rises from chest:
  - Companion: `?` character sprite or silhouette
  - Consumable: Generic potion outline
- Text: `you found a companion...` or `you found a consumable...`

### Stage 4: Item Reveal

- Full item display with appropriate sprite
- Consumables: Mapped sprite based on effect type
- Companions: Generated image or placeholder character sprite
- Item card with name, rarity border, effects list
- Buttons: `[ open another ]` / `[ done ]`

---

## Consumable Sprite System

### Effect Type Mapping

| Effect Type | Sprite | Tile |
|-------------|--------|------|
| `xp_boost` | Green potion | tile_0114 |
| `luck` | Gold coin/gem | tile_0056 |
| `rare_luck` | Blue/silver potion | tile_0113 |
| `legendary_luck` | Gold potion | tile_0127 |
| `drop_rate_boost` | Red potion | tile_0103 |
| `streak_shield` | Shield | tile_0102 |
| `box_upgrade` | Chest | tile_0054 |
| `guaranteed_companion` | Character | tile_0100 |
| `instant_level` | Scroll | tile_0105 |

### Tier Visual Scaling

| Tier | Sprite Size | Border |
|------|-------------|--------|
| Weak | 32px (2x) | Brown, no glow |
| Medium | 48px (3x) | Silver tint, subtle glow |
| Strong | 64px (4x) | Gold border, shimmer |

---

## UI Components

### DungeonCard

Reusable container with dungeon styling:

```typescript
interface DungeonCardProps {
  children: ReactNode;
  variant?: 'default' | 'rare' | 'legendary';
  size?: 'small' | 'medium' | 'large';
}
```

- Stone background (#3a3a3a)
- 2px solid border, color based on variant
- Consistent padding from theme spacing

### DungeonBar

Health/XP bar styled component:

```typescript
interface DungeonBarProps {
  value: number;
  max: number;
  color?: 'amber' | 'green' | 'red';
  showText?: boolean;
}
```

- Stone border (#4a4a4a)
- Dark stone background
- Colored fill (default amber/torchlight)
- Optional "123 / 1000" text overlay

### PixelSprite

Scaled pixel art renderer:

```typescript
interface PixelSpriteProps {
  tile: string;        // e.g., 'tile_0054'
  scale?: 2 | 3 | 4;   // multiplier
  tint?: string;       // optional color overlay
}
```

- Handles path resolution to assets folder
- Applies nearest-neighbor scaling
- Supports tint for gold/silver variations

### ConsumableIcon

Consumable-specific sprite renderer:

```typescript
interface ConsumableIconProps {
  effectType: ConsumableEffectType;
  tier: 'weak' | 'medium' | 'strong';
}
```

- Looks up sprite from effect type mapping
- Applies tier-based sizing and border

### ChestReveal

Staged reveal component:

```typescript
interface ChestRevealProps {
  tier: LootBoxTier;
  category: 'companion' | 'consumable';
  item: Companion | ConsumableDefinition;
  onComplete: () => void;
}
```

- Internal state machine for stages
- Handles timing and transitions
- Renders appropriate sprites per stage

---

## Screen Applications

### Loot Box Screen

**File:** `app/loot-box.tsx`

- Replace text-based display with ChestReveal component
- Box count: Stack of small chest sprites or `×5` badge
- Background: Full dungeon dark

### Profile Screen

**File:** `app/(tabs)/profile.tsx`

- Stats section: DungeonCard frame, DungeonBar for XP
- Loadout slots: Stone frames, locked slots show chain/lock icon
- Active effects: ConsumableIcon + text + DungeonBar for duration
- Genre levels: Keep collapsible, add small genre icons if sprites available
- Slot progress: DungeonBar styled

### Collection Tab

**File:** `app/(tabs)/collection.tsx`

- Companion grid: DungeonCard per companion
- Border color indicates rarity
- Equipped indicator: Small torch or glow

### Library Tab

**File:** `app/(tabs)/library.tsx`

- Book cards: DungeonCard frames
- Book level: Small DungeonBar
- Status icons: Reading/finished indicators

### Timer Screen

**File:** `app/timer/[bookId].tsx`

- Time display: Large monospace on stone background
- Milestone markers: Small gem or torch icons
- Complete state: Transition to loot reveal

### Session Results

**File:** `app/session-results.tsx`

- XP gained: Animated DungeonBar fill
- Loot earned: Chest sprites with count
- Level ups: Highlighted with glow
- CTA: `[ claim loot ]` button

### Home/Index

**File:** `app/(tabs)/index.tsx`

- Featured book: Large DungeonCard
- Quick stats: Smaller stat cards
- Streak: Flame/torch icon styling

---

## File Structure

### New Files

```
lib/
  themes/
    dungeon.ts          # Dungeon color palette
  dungeonAssets.ts      # Tile mappings & constants

components/
  dungeon/
    PixelSprite.tsx     # Scaled sprite renderer
    DungeonCard.tsx     # Framed container
    DungeonBar.tsx      # Progress bar
    ConsumableIcon.tsx  # Effect type → sprite
    ChestReveal.tsx     # Loot box stages
```

### Modified Files

```
lib/
  theme.ts              # Add dungeon theme, set default
  ThemeContext.tsx      # Theme switching support

components/
  LootBoxReveal.tsx     # Integrate ChestReveal

app/
  loot-box.tsx          # Chest sprites, new flow
  session-results.tsx   # Dungeon styling
  (tabs)/
    profile.tsx         # Full dungeon treatment
    collection.tsx      # Companion cards
    library.tsx         # Book cards
    index.tsx           # Home styling
  timer/
    [bookId].tsx        # Timer styling
```

---

## Implementation Order

### Phase 1: Foundation
1. Create `lib/themes/dungeon.ts` with color palette
2. Create `lib/dungeonAssets.ts` with tile mappings
3. Create `components/dungeon/PixelSprite.tsx`
4. Integrate dungeon theme into theme system

### Phase 2: Loot Experience
5. Create `components/dungeon/ChestReveal.tsx`
6. Update `components/LootBoxReveal.tsx` to use stages
7. Update `app/loot-box.tsx` with new visuals

### Phase 3: Core Components
8. Create `components/dungeon/DungeonCard.tsx`
9. Create `components/dungeon/DungeonBar.tsx`
10. Create `components/dungeon/ConsumableIcon.tsx`

### Phase 4: Screen Updates
11. Update `app/(tabs)/profile.tsx`
12. Update `app/session-results.tsx`
13. Update `app/(tabs)/collection.tsx`
14. Update `app/(tabs)/library.tsx`
15. Update `app/(tabs)/index.tsx`
16. Update `app/timer/[bookId].tsx`

---

## Notes

- No external dependencies required
- All animations use React Native Animated or CSS transforms
- Sprites are local assets, no network loading
- Theme persists to AsyncStorage via existing settings system
- Fallback to text if sprite fails to load
