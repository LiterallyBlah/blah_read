# Dungeon Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform BlahRead into a dungeon-crawler styled reading tracker using Kenney Tiny Dungeon pixel art assets.

**Architecture:** Add a new "dungeon" theme with stone/parchment colors as the default. Create reusable dungeon-styled components (PixelSprite, DungeonCard, DungeonBar). Implement progressive loot box reveal with chest animations. Apply theme across all screens.

**Tech Stack:** React Native, Expo, TypeScript, Jest

---

## Task 1: Dungeon Color Palette

**Files:**
- Create: `lib/themes/dungeon.ts`
- Test: `__tests__/lib/themes/dungeon.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/themes/dungeon.test.ts
import { COLORS_DUNGEON } from '@/lib/themes/dungeon';

describe('dungeon theme', () => {
  it('exports dungeon color palette', () => {
    expect(COLORS_DUNGEON.background).toBe('#1a1a1a');
    expect(COLORS_DUNGEON.surface).toBe('#2d2d2d');
    expect(COLORS_DUNGEON.card).toBe('#3a3a3a');
    expect(COLORS_DUNGEON.text).toBe('#f5deb3');
    expect(COLORS_DUNGEON.textSecondary).toBe('#c4a574');
    expect(COLORS_DUNGEON.accent).toBe('#ffb347');
  });

  it('exports rarity colors for loot tiers', () => {
    expect(COLORS_DUNGEON.rarityCommon).toBe('#8b4513');
    expect(COLORS_DUNGEON.rarityRare).toBe('#c0c0c0');
    expect(COLORS_DUNGEON.rarityLegendary).toBe('#ffd700');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/themes/dungeon.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// lib/themes/dungeon.ts
export const COLORS_DUNGEON = {
  // Backgrounds
  background: '#1a1a1a',      // Deep stone
  backgroundLight: '#252525',
  backgroundCard: '#2d2d2d',
  surface: '#2d2d2d',         // Stone
  card: '#3a3a3a',            // Light stone

  // Text
  primary: '#f5deb3',
  primaryMuted: '#c4a574',
  text: '#f5deb3',            // Parchment
  textSecondary: '#c4a574',   // Aged parchment
  textMuted: '#7a6a5a',       // Faded

  // Borders
  border: '#4a4a4a',          // Stone edge
  secondary: '#4a4a4a',
  accent: '#ffb347',          // Torchlight/amber

  // Status
  success: '#4a7c4e',         // Dungeon green
  error: '#8b3a3a',           // Dark red
  warning: '#b8860b',         // Dark gold

  // Rarity (loot box tiers)
  rarityCommon: '#8b4513',    // Wood brown
  rarityRare: '#c0c0c0',      // Silver
  rarityEpic: '#9B59B6',      // Purple (kept for compatibility)
  rarityLegendary: '#ffd700', // Gold

  // Prestige tiers (kept for compatibility)
  prestigeBronze: '#CD7F32',
  prestigeSilver: '#C0C0C0',
  prestigeGold: '#FFD700',
  prestigePlatinum: '#E5E4E2',
  prestigeDiamond: '#B9F2FF',
} as const;
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/themes/dungeon.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/themes/dungeon.ts __tests__/lib/themes/dungeon.test.ts
git commit -m "feat(theme): add dungeon color palette"
```

---

## Task 2: Dungeon Asset Mappings

**Files:**
- Create: `lib/dungeonAssets.ts`
- Test: `__tests__/lib/dungeonAssets.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/dungeonAssets.test.ts
import {
  DUNGEON_TILES,
  CHEST_TILES,
  CONSUMABLE_TILES,
  getTilePath,
  getChestTile,
  getConsumableTile,
} from '@/lib/dungeonAssets';

describe('dungeonAssets', () => {
  describe('getTilePath', () => {
    it('returns correct path for tile name', () => {
      expect(getTilePath('tile_0054')).toBe(
        require('@/assets/kenney_tiny-dungeon/Tiles/tile_0054.png')
      );
    });
  });

  describe('getChestTile', () => {
    it('returns wood chest for wood tier', () => {
      expect(getChestTile('wood', 'closed')).toBeDefined();
    });

    it('returns silver chest for silver tier', () => {
      expect(getChestTile('silver', 'closed')).toBeDefined();
    });

    it('returns gold chest for gold tier', () => {
      expect(getChestTile('gold', 'closed')).toBeDefined();
    });

    it('returns open chest state', () => {
      expect(getChestTile('wood', 'open')).toBeDefined();
    });
  });

  describe('getConsumableTile', () => {
    it('returns correct tile for xp_boost', () => {
      expect(getConsumableTile('xp_boost')).toBeDefined();
    });

    it('returns correct tile for luck', () => {
      expect(getConsumableTile('luck')).toBeDefined();
    });

    it('returns correct tile for streak_shield', () => {
      expect(getConsumableTile('streak_shield')).toBeDefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/dungeonAssets.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// lib/dungeonAssets.ts
import type { LootBoxTier } from './types';
import type { ConsumableEffectType } from './consumables';

// Tile require mappings - React Native needs static requires
export const DUNGEON_TILES = {
  // Chests
  chest_wood_closed: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0054.png'),
  chest_silver_closed: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0055.png'),
  chest_gold_closed: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0055.png'), // Tinted in component
  chest_open: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0067.png'),

  // Potions
  potion_red: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0103.png'),
  potion_green: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0114.png'),
  potion_blue: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0113.png'),
  potion_gold: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0127.png'),

  // Items
  scroll: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0105.png'),
  shield: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0102.png'),
  gem: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0056.png'),
  coin: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0101.png'),

  // Characters (for companion placeholders)
  character_knight: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0100.png'),
  character_wizard: require('@/assets/kenney_tiny-dungeon/Tiles/tile_0110.png'),
} as const;

// Chest state/tier mapping
export const CHEST_TILES: Record<LootBoxTier, { closed: keyof typeof DUNGEON_TILES; open: keyof typeof DUNGEON_TILES }> = {
  wood: { closed: 'chest_wood_closed', open: 'chest_open' },
  silver: { closed: 'chest_silver_closed', open: 'chest_open' },
  gold: { closed: 'chest_gold_closed', open: 'chest_open' },
};

// Consumable effect type to tile mapping
export const CONSUMABLE_TILES: Record<ConsumableEffectType, keyof typeof DUNGEON_TILES> = {
  xp_boost: 'potion_green',
  luck: 'gem',
  rare_luck: 'potion_blue',
  legendary_luck: 'potion_gold',
  drop_rate_boost: 'potion_red',
  streak_shield: 'shield',
  box_upgrade: 'chest_wood_closed',
  guaranteed_companion: 'character_knight',
  instant_level: 'scroll',
};

export function getTilePath(tileName: string): number {
  // For dynamic tile names, construct the require
  // Note: This only works for tiles we've pre-registered
  const key = tileName as keyof typeof DUNGEON_TILES;
  if (DUNGEON_TILES[key]) {
    return DUNGEON_TILES[key];
  }
  // Fallback to gem
  return DUNGEON_TILES.gem;
}

export function getChestTile(tier: LootBoxTier, state: 'closed' | 'open'): number {
  const tileKey = CHEST_TILES[tier][state];
  return DUNGEON_TILES[tileKey];
}

export function getConsumableTile(effectType: ConsumableEffectType): number {
  const tileKey = CONSUMABLE_TILES[effectType];
  return DUNGEON_TILES[tileKey];
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/dungeonAssets.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/dungeonAssets.ts __tests__/lib/dungeonAssets.test.ts
git commit -m "feat(assets): add dungeon tile mappings"
```

---

## Task 3: Integrate Dungeon Theme into Theme System

**Files:**
- Modify: `lib/theme.ts`
- Modify: `lib/settings.ts`
- Modify: `lib/ThemeContext.tsx`
- Modify: `__tests__/lib/theme.test.ts`

**Step 1: Update theme.ts to export dungeon colors**

```typescript
// Add to lib/theme.ts after COLORS_LIGHT:

export { COLORS_DUNGEON } from './themes/dungeon';
```

**Step 2: Update settings.ts to add dungeon theme option**

In `lib/settings.ts`, change line 20:
```typescript
// Old:
  theme: 'auto' | 'dark' | 'light';
// New:
  theme: 'auto' | 'dark' | 'light' | 'dungeon';
```

And change line 35 (defaultSettings):
```typescript
// Old:
  theme: 'auto',
// New:
  theme: 'dungeon',
```

**Step 3: Update ThemeContext.tsx to handle dungeon theme**

Replace `lib/ThemeContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, COLORS_LIGHT, COLORS_DUNGEON, FONTS, spacing as baseSpacing, fontSize as baseFontSize, letterSpacing } from './theme';
import { settings, Settings } from './settings';

interface ThemeContextValue {
  colors: typeof COLORS;
  fonts: typeof FONTS;
  spacing: typeof baseSpacing;
  fontSize: (size: 'micro' | 'small' | 'body' | 'large' | 'title' | 'hero') => number;
  letterSpacing: typeof letterSpacing;
  isDark: boolean;
  themeName: Settings['theme'];
  fontScale: number;
  reload: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<Settings['theme']>('dungeon');
  const [fontScale, setFontScale] = useState<number>(1);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const s = await settings.get();
    setTheme(s.theme);
    setFontScale(s.fontScale);
  }

  // Determine colors based on theme
  let colors: typeof COLORS;
  let isDark: boolean;

  if (theme === 'dungeon') {
    colors = COLORS_DUNGEON as typeof COLORS;
    isDark = true;
  } else if (theme === 'auto') {
    isDark = systemScheme !== 'light';
    colors = isDark ? COLORS : COLORS_LIGHT;
  } else if (theme === 'dark') {
    isDark = true;
    colors = COLORS;
  } else {
    isDark = false;
    colors = COLORS_LIGHT;
  }

  const scaledFontSize = (size: 'micro' | 'small' | 'body' | 'large' | 'title' | 'hero') => {
    return Math.round(baseFontSize(size) * fontScale);
  };

  return (
    <ThemeContext.Provider value={{
      colors,
      fonts: FONTS,
      spacing: baseSpacing,
      fontSize: scaledFontSize,
      letterSpacing,
      isDark,
      themeName: theme,
      fontScale,
      reload: loadSettings,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

**Step 4: Update theme tests**

Add to `__tests__/lib/theme.test.ts`:

```typescript
import { COLORS_DUNGEON } from '@/lib/theme';

// Add new test:
it('exports COLORS_DUNGEON with dungeon palette', () => {
  expect(COLORS_DUNGEON.background).toBe('#1a1a1a');
  expect(COLORS_DUNGEON.text).toBe('#f5deb3');
  expect(COLORS_DUNGEON.accent).toBe('#ffb347');
});
```

**Step 5: Run tests**

Run: `npm test -- __tests__/lib/theme.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add lib/theme.ts lib/settings.ts lib/ThemeContext.tsx __tests__/lib/theme.test.ts
git commit -m "feat(theme): integrate dungeon theme as default"
```

---

## Task 4: PixelSprite Component

**Files:**
- Create: `components/dungeon/PixelSprite.tsx`

**Step 1: Create the component**

```typescript
// components/dungeon/PixelSprite.tsx
import React from 'react';
import { Image, ImageStyle, StyleProp, View, ViewStyle } from 'react-native';
import { DUNGEON_TILES } from '@/lib/dungeonAssets';

interface PixelSpriteProps {
  tile: keyof typeof DUNGEON_TILES;
  scale?: 2 | 3 | 4;
  tint?: string;
  style?: StyleProp<ViewStyle>;
}

const BASE_SIZE = 16;

export function PixelSprite({ tile, scale = 2, tint, style }: PixelSpriteProps) {
  const size = BASE_SIZE * scale;
  const source = DUNGEON_TILES[tile];

  const imageStyle: ImageStyle = {
    width: size,
    height: size,
    // Nearest neighbor scaling for pixel art
    // Note: React Native doesn't have imageRendering, but resizeMode="nearest" is not supported
    // We rely on the small source size + exact integer scaling to keep pixels crisp
  };

  if (tint) {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <Image
          source={source}
          style={[imageStyle, { tintColor: tint }]}
          resizeMode="stretch"
        />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={[imageStyle, style]}
      resizeMode="stretch"
    />
  );
}
```

**Step 2: Commit**

```bash
git add components/dungeon/PixelSprite.tsx
git commit -m "feat(components): add PixelSprite for scaled pixel art"
```

---

## Task 5: DungeonCard Component

**Files:**
- Create: `components/dungeon/DungeonCard.tsx`

**Step 1: Create the component**

```typescript
// components/dungeon/DungeonCard.tsx
import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface DungeonCardProps {
  children: ReactNode;
  variant?: 'default' | 'common' | 'rare' | 'legendary';
  noPadding?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function DungeonCard({ children, variant = 'default', noPadding, style }: DungeonCardProps) {
  const { colors, spacing } = useTheme();

  const borderColors: Record<string, string> = {
    default: colors.border,
    common: colors.rarityCommon,
    rare: colors.rarityRare,
    legendary: colors.rarityLegendary,
  };

  const borderColor = borderColors[variant] || colors.border;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card || colors.backgroundCard,
          borderColor,
          padding: noPadding ? 0 : spacing(4),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
  },
});
```

**Step 2: Commit**

```bash
git add components/dungeon/DungeonCard.tsx
git commit -m "feat(components): add DungeonCard container"
```

---

## Task 6: DungeonBar Component

**Files:**
- Create: `components/dungeon/DungeonBar.tsx`

**Step 1: Create the component**

```typescript
// components/dungeon/DungeonBar.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';

interface DungeonBarProps {
  value: number;
  max: number;
  color?: 'amber' | 'green' | 'red';
  showText?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function DungeonBar({
  value,
  max,
  color = 'amber',
  showText = false,
  height = 8,
  style,
}: DungeonBarProps) {
  const { colors, spacing, fontSize } = useTheme();

  const fillColors: Record<string, string> = {
    amber: colors.accent || '#ffb347',
    green: colors.success,
    red: colors.error,
  };

  const fillColor = fillColors[color] || colors.accent;
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <View style={style}>
      <View
        style={[
          styles.container,
          {
            height,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
      {showText && (
        <Text
          style={[
            styles.text,
            {
              color: colors.textMuted,
              fontSize: fontSize('micro'),
            },
          ]}
        >
          {value} / {max}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  text: {
    fontFamily: FONTS.mono,
    marginTop: 2,
  },
});
```

**Step 2: Commit**

```bash
git add components/dungeon/DungeonBar.tsx
git commit -m "feat(components): add DungeonBar progress bar"
```

---

## Task 7: ConsumableIcon Component

**Files:**
- Create: `components/dungeon/ConsumableIcon.tsx`

**Step 1: Create the component**

```typescript
// components/dungeon/ConsumableIcon.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { PixelSprite } from './PixelSprite';
import { CONSUMABLE_TILES, DUNGEON_TILES } from '@/lib/dungeonAssets';
import type { ConsumableEffectType, ConsumableTier } from '@/lib/consumables';

interface ConsumableIconProps {
  effectType: ConsumableEffectType;
  tier: ConsumableTier;
  style?: StyleProp<ViewStyle>;
}

export function ConsumableIcon({ effectType, tier, style }: ConsumableIconProps) {
  const { colors } = useTheme();

  // Scale based on tier
  const scale: 2 | 3 | 4 = tier === 'strong' ? 4 : tier === 'medium' ? 3 : 2;

  // Border color based on tier
  const borderColors: Record<ConsumableTier, string> = {
    weak: colors.rarityCommon,
    medium: colors.rarityRare,
    strong: colors.rarityLegendary,
  };

  const tileKey = CONSUMABLE_TILES[effectType];

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: borderColors[tier],
          borderWidth: tier === 'strong' ? 2 : 1,
        },
        style,
      ]}
    >
      <PixelSprite tile={tileKey} scale={scale} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

**Step 2: Commit**

```bash
git add components/dungeon/ConsumableIcon.tsx
git commit -m "feat(components): add ConsumableIcon with tier scaling"
```

---

## Task 8: ChestReveal Component (Loot Box Progressive Reveal)

**Files:**
- Create: `components/dungeon/ChestReveal.tsx`

**Step 1: Create the component**

```typescript
// components/dungeon/ChestReveal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { PixelSprite } from './PixelSprite';
import { ConsumableIcon } from './ConsumableIcon';
import { getChestTile, CHEST_TILES, DUNGEON_TILES } from '@/lib/dungeonAssets';
import type { LootBoxTier, Companion } from '@/lib/types';
import type { ConsumableDefinition } from '@/lib/consumables';

type RevealStage = 'closed' | 'shaking' | 'open' | 'category' | 'item';

interface ChestRevealProps {
  tier: LootBoxTier;
  category: 'companion' | 'consumable';
  companion?: Companion | null;
  consumable?: ConsumableDefinition | null;
  onComplete: () => void;
  hasMoreBoxes: boolean;
  onOpenAnother: () => void;
}

const TIER_LABELS: Record<LootBoxTier, string> = {
  wood: 'wood box',
  silver: 'silver box',
  gold: 'gold box',
};

export function ChestReveal({
  tier,
  category,
  companion,
  consumable,
  onComplete,
  hasMoreBoxes,
  onOpenAnother,
}: ChestRevealProps) {
  const { colors, spacing, fontSize } = useTheme();
  const [stage, setStage] = useState<RevealStage>('closed');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const tierColors: Record<LootBoxTier, string> = {
    wood: colors.rarityCommon,
    silver: colors.rarityRare,
    gold: colors.rarityLegendary,
  };

  // Handle stage transitions
  useEffect(() => {
    if (stage === 'shaking') {
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start(() => {
        setStage('open');
      });
    } else if (stage === 'open') {
      // Fade in tier label
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      // Move to category after delay
      setTimeout(() => setStage('category'), 800);
    } else if (stage === 'category') {
      // Move to item after delay
      setTimeout(() => setStage('item'), 600);
    }
  }, [stage]);

  const handleTap = () => {
    if (stage === 'closed') {
      setStage('shaking');
    }
  };

  const shakeTransform = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  // Get chest tile key
  const chestTileKey = stage === 'closed' || stage === 'shaking'
    ? CHEST_TILES[tier].closed
    : CHEST_TILES[tier].open;

  // Gold tint for gold chests
  const chestTint = tier === 'gold' && (stage === 'closed' || stage === 'shaking')
    ? colors.rarityLegendary
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Chest area */}
      <Pressable onPress={handleTap} style={styles.chestArea}>
        <Animated.View style={{ transform: [{ rotate: shakeTransform }] }}>
          <PixelSprite tile={chestTileKey} scale={4} tint={chestTint} />
        </Animated.View>

        {stage === 'closed' && (
          <Text style={[styles.tapText, { color: colors.textMuted }]}>
            tap to open
          </Text>
        )}

        {/* Tier label (shows after open) */}
        {(stage === 'open' || stage === 'category' || stage === 'item') && (
          <Animated.Text
            style={[
              styles.tierLabel,
              { color: tierColors[tier], opacity: fadeAnim },
            ]}
          >
            [{TIER_LABELS[tier]}]
          </Animated.Text>
        )}
      </Pressable>

      {/* Category hint */}
      {stage === 'category' && (
        <View style={styles.categoryHint}>
          <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
            you found a {category}...
          </Text>
        </View>
      )}

      {/* Item reveal */}
      {stage === 'item' && (
        <View style={styles.itemReveal}>
          {category === 'consumable' && consumable && (
            <View style={styles.itemCard}>
              <ConsumableIcon
                effectType={consumable.effectType}
                tier={consumable.tier}
              />
              <Text style={[styles.itemName, { color: colors.text }]}>
                {consumable.name.toLowerCase()}
              </Text>
              <Text style={[styles.itemRarity, { color: tierColors[tier] }]}>
                [{consumable.tier}]
              </Text>
              <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
                {consumable.description}
              </Text>
            </View>
          )}

          {category === 'companion' && companion && (
            <View style={styles.itemCard}>
              {companion.imageUrl ? (
                <View style={styles.companionImage}>
                  {/* Companion image handled by parent */}
                </View>
              ) : (
                <PixelSprite tile="character_knight" scale={4} />
              )}
              <Text style={[styles.itemName, { color: colors.text }]}>
                {companion.name.toLowerCase()}
              </Text>
              <Text style={[styles.itemRarity, { color: tierColors[tier] }]}>
                [{companion.rarity}]
              </Text>
              <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
                {companion.description}
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttons}>
            {hasMoreBoxes && (
              <Pressable
                style={[styles.primaryButton, { borderColor: colors.text }]}
                onPress={onOpenAnother}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  [ open another ]
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={onComplete}
            >
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                [ done ]
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  chestArea: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tapText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    marginTop: 16,
  },
  tierLabel: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 16,
    marginTop: 16,
  },
  categoryHint: {
    marginTop: 16,
  },
  categoryText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
  },
  itemReveal: {
    alignItems: 'center',
    marginTop: 24,
  },
  itemCard: {
    alignItems: 'center',
    padding: 16,
    minWidth: 200,
  },
  companionImage: {
    width: 64,
    height: 64,
    marginBottom: 8,
  },
  itemName: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  itemRarity: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 14,
    marginTop: 4,
  },
  itemDesc: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 250,
  },
  buttons: {
    marginTop: 32,
    gap: 12,
  },
  primaryButton: {
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 14,
  },
});
```

**Step 2: Commit**

```bash
git add components/dungeon/ChestReveal.tsx
git commit -m "feat(components): add ChestReveal with progressive stages"
```

---

## Task 9: Create Dungeon Component Index

**Files:**
- Create: `components/dungeon/index.ts`

**Step 1: Create barrel export**

```typescript
// components/dungeon/index.ts
export { PixelSprite } from './PixelSprite';
export { DungeonCard } from './DungeonCard';
export { DungeonBar } from './DungeonBar';
export { ConsumableIcon } from './ConsumableIcon';
export { ChestReveal } from './ChestReveal';
```

**Step 2: Commit**

```bash
git add components/dungeon/index.ts
git commit -m "feat(components): add dungeon component barrel export"
```

---

## Task 10: Update LootBoxReveal to Use ChestReveal

**Files:**
- Modify: `components/LootBoxReveal.tsx`

**Step 1: Update component**

Replace the content of `components/LootBoxReveal.tsx`:

```typescript
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { ChestReveal } from './dungeon/ChestReveal';
import { ConsumableIcon } from './dungeon/ConsumableIcon';
import type { Companion, LootBoxTier } from '@/lib/types';
import { formatDuration, type ConsumableDefinition } from '@/lib/consumables';

interface Props {
  companion: Companion | null;
  consumable?: ConsumableDefinition | null;
  boxTier?: LootBoxTier | null;
  onDismiss: () => void;
  hasMoreBoxes: boolean;
  onOpenAnother: () => void;
}

export function LootBoxReveal({
  companion,
  consumable,
  boxTier,
  onDismiss,
  hasMoreBoxes,
  onOpenAnother,
}: Props) {
  const { colors, themeName } = useTheme();

  // Use ChestReveal for dungeon theme
  if (themeName === 'dungeon' && boxTier) {
    const category = consumable ? 'consumable' : 'companion';
    return (
      <ChestReveal
        tier={boxTier}
        category={category}
        companion={companion}
        consumable={consumable}
        onComplete={onDismiss}
        hasMoreBoxes={hasMoreBoxes}
        onOpenAnother={onOpenAnother}
      />
    );
  }

  // Fallback to original reveal for other themes
  const { spacing, fontSize } = useTheme();
  const styles = createStyles(colors, spacing, fontSize);

  const rarityColors: Record<string, string> = {
    common: colors.rarityCommon,
    rare: colors.rarityRare,
    legendary: colors.rarityLegendary,
  };

  const tierColors: Record<LootBoxTier, string> = {
    wood: colors.rarityCommon,
    silver: colors.rarityRare,
    gold: colors.rarityLegendary,
  };

  const TIER_LABELS: Record<LootBoxTier, string> = {
    wood: 'wood box',
    silver: 'silver box',
    gold: 'gold box',
  };

  const CONSUMABLE_TIER_COLORS = {
    weak: 'rarityCommon',
    medium: 'rarityRare',
    strong: 'rarityLegendary',
  } as const;

  // Handle consumable reveal
  if (consumable) {
    const consumableTierColor = colors[CONSUMABLE_TIER_COLORS[consumable.tier]];
    const boxColor = boxTier ? tierColors[boxTier] : colors.text;

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {boxTier && (
          <Text style={[styles.boxTierHeader, { color: boxColor }]}>
            [{TIER_LABELS[boxTier]}]
          </Text>
        )}

        <View style={[styles.card, { borderColor: consumableTierColor }]}>
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
            <ConsumableIcon effectType={consumable.effectType} tier={consumable.tier} />
          </View>

          <Text style={[styles.name, { color: colors.text }]}>
            {consumable.name.toLowerCase()}
          </Text>

          <Text style={[styles.rarity, { color: consumableTierColor }]}>
            [{consumable.tier}]
          </Text>

          <Text style={[styles.type, { color: colors.textSecondary }]}>
            consumable
          </Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {consumable.description}
          </Text>

          {consumable.duration > 0 && (
            <Text style={[styles.source, { color: colors.textMuted }]}>
              {formatDuration(consumable.duration)}
            </Text>
          )}
          {consumable.duration === 0 && (
            <Text style={[styles.source, { color: colors.textMuted }]}>
              instant effect
            </Text>
          )}
        </View>

        <View style={styles.buttons}>
          {hasMoreBoxes ? (
            <Pressable
              style={[styles.primaryButton, { borderColor: colors.text }]}
              onPress={onOpenAnother}
            >
              <Text style={[styles.primaryButtonText, { color: colors.text }]}>
                [ open another ]
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={onDismiss}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
              [done]
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Handle companion reveal (original behavior)
  if (!companion) {
    return null;
  }

  const rarityColor = rarityColors[companion.rarity] || colors.text;
  const boxColor = boxTier ? tierColors[boxTier] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {boxTier && (
        <Text style={[styles.boxTierHeader, { color: boxColor }]}>
          [{TIER_LABELS[boxTier]}]
        </Text>
      )}

      <View style={[styles.card, { borderColor: rarityColor }]}>
        {companion.imageUrl ? (
          <Image source={{ uri: companion.imageUrl }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
            <Text style={[styles.placeholderText, { color: colors.textMuted }]}>?</Text>
          </View>
        )}

        <Text style={[styles.name, { color: colors.text }]}>
          {companion.name.toLowerCase()}
        </Text>

        <Text style={[styles.rarity, { color: rarityColor }]}>
          [{companion.rarity}]
        </Text>

        <Text style={[styles.type, { color: colors.textSecondary }]}>
          {companion.type}
        </Text>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {companion.description}
        </Text>

        <Text style={[styles.source, { color: colors.textMuted }]}>
          {companion.source === 'discovered' ? 'discovered' : 'inspired'}
        </Text>
      </View>

      <View style={styles.buttons}>
        {hasMoreBoxes ? (
          <Pressable
            style={[styles.primaryButton, { borderColor: colors.text }]}
            onPress={onOpenAnother}
          >
            <Text style={[styles.primaryButtonText, { color: colors.text }]}>
              [ open another ]
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={onDismiss}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
            [done]
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize']
) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(6),
  },
  boxTierHeader: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('body'),
    marginBottom: spacing(4),
  },
  card: {
    padding: spacing(6),
    borderWidth: 2,
    alignItems: 'center',
    maxWidth: 300,
  },
  image: {
    width: 128,
    height: 128,
  },
  imagePlaceholder: {
    width: 128,
    height: 128,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontFamily: FONTS.mono,
    fontSize: 48,
  },
  name: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    marginTop: spacing(4),
    textAlign: 'center',
  },
  rarity: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('body'),
    marginTop: spacing(2),
  },
  type: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    marginTop: spacing(1),
  },
  description: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    textAlign: 'center',
    marginTop: spacing(4),
    lineHeight: 20,
  },
  source: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    marginTop: spacing(3),
  },
  buttons: {
    marginTop: spacing(8),
    gap: spacing(3),
  },
  primaryButton: {
    borderWidth: 1,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(6),
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('body'),
  },
  secondaryButton: {
    borderWidth: 1,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(6),
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
  },
});
```

**Step 2: Commit**

```bash
git add components/LootBoxReveal.tsx
git commit -m "feat(loot): integrate ChestReveal for dungeon theme"
```

---

## Task 11: Update Loot Box Screen

**Files:**
- Modify: `app/loot-box.tsx`

**Step 1: Update to show chest sprites for box count**

Add import at top of `app/loot-box.tsx`:
```typescript
import { PixelSprite } from '@/components/dungeon/PixelSprite';
```

Find the section showing box count (around line 316-317) and update:

```typescript
{/* Show chest icon in dungeon theme */}
<View style={styles.boxCountRow}>
  <PixelSprite tile="chest_wood_closed" scale={2} />
  <Text style={[styles.countText, { color: colors.textSecondary }]}>
    {boxCount} box{boxCount !== 1 ? 'es' : ''} available
  </Text>
</View>
```

Add to styles:
```typescript
boxCountRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing(3),
  marginBottom: spacing(4),
},
```

**Step 2: Commit**

```bash
git add app/loot-box.tsx
git commit -m "feat(loot): add chest sprite to box count display"
```

---

## Task 12: Update Profile Screen with Dungeon Components

**Files:**
- Modify: `app/(tabs)/profile.tsx`

**Step 1: Add imports**

Add at top:
```typescript
import { DungeonCard, DungeonBar, ConsumableIcon } from '@/components/dungeon';
```

**Step 2: Update XP bar section (around line 86-91)**

Replace:
```typescript
{/* XP progress */}
<View style={styles.xpSection}>
  <DungeonBar
    value={xp.current}
    max={xp.needed}
    color="amber"
    showText
  />
</View>
```

**Step 3: Update active effects section (around line 146-165)**

Update the consumable item display:
```typescript
{progress.activeConsumables.map((ac, index) => {
  const consumable = getConsumableById(ac.consumableId);
  if (!consumable) return null;

  return (
    <DungeonCard key={`${ac.consumableId}-${index}`} variant="default">
      <View style={styles.consumableRow}>
        <ConsumableIcon effectType={consumable.effectType} tier={consumable.tier} />
        <View style={styles.consumableInfo}>
          <Text style={styles.consumableName}>{consumable.name.toLowerCase()}</Text>
          <Text style={styles.consumableDesc}>{consumable.description}</Text>
          <DungeonBar
            value={ac.remainingDuration}
            max={consumable.duration}
            color="green"
            height={4}
          />
        </View>
      </View>
    </DungeonCard>
  );
})}
```

Add styles:
```typescript
consumableRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing(3),
},
consumableInfo: {
  flex: 1,
},
```

**Step 4: Commit**

```bash
git add app/(tabs)/profile.tsx
git commit -m "feat(profile): integrate dungeon components for XP and consumables"
```

---

## Task 13: Update Collection Screen

**Files:**
- Modify: `app/(tabs)/collection.tsx`

**Step 1: Add imports**

Add at top:
```typescript
import { DungeonCard, PixelSprite } from '@/components/dungeon';
```

**Step 2: Update loot box banner (around line 459-468)**

Replace:
```typescript
{boxCount > 0 && (
  <Pressable
    style={styles.lootBoxBanner}
    onPress={() => router.push('/loot-box')}
  >
    <PixelSprite tile="chest_wood_closed" scale={2} />
    <Text style={styles.lootBoxText}>
      {boxCount} box{boxCount !== 1 ? 'es' : ''} to open
    </Text>
  </Pressable>
)}
```

**Step 3: Commit**

```bash
git add app/(tabs)/collection.tsx
git commit -m "feat(collection): add chest sprite to loot box banner"
```

---

## Task 14: Update Home Screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Step 1: Add imports**

Add at top:
```typescript
import { DungeonBar } from '@/components/dungeon';
```

**Step 2: Update XP bar (around line 62-65)**

Replace:
```typescript
{/* XP progress bar */}
<DungeonBar
  value={xp.current}
  max={xp.needed}
  color="amber"
  showText
  style={styles.xpBar}
/>
```

Remove the old xpBar and xpFill styles, update xpBar style:
```typescript
xpBar: {
  marginBottom: spacing(10),
},
```

**Step 3: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat(home): use DungeonBar for XP display"
```

---

## Task 15: Update Library Screen

**Files:**
- Modify: `app/(tabs)/library.tsx`

**Step 1: No major component changes needed**

The library uses BookCard which can be updated later. For now, the dungeon theme colors will apply automatically through the theme context.

**Step 2: Commit (if any changes)**

```bash
git add app/(tabs)/library.tsx
git commit -m "style(library): dungeon theme colors applied"
```

---

## Task 16: Update Session Results Screen

**Files:**
- Modify: `app/session-results.tsx`

**Step 1: Add imports**

Add at top:
```typescript
import { DungeonBar, DungeonCard, PixelSprite } from '@/components/dungeon';
```

**Step 2: Update XP display and loot boxes earned**

Find XP display section and use DungeonBar. Find loot box display and add chest sprites.

**Step 3: Commit**

```bash
git add app/session-results.tsx
git commit -m "feat(session-results): integrate dungeon components"
```

---

## Task 17: Final Integration Test

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Manual testing checklist**

- [ ] App launches with dungeon theme by default
- [ ] Home screen shows amber XP bar
- [ ] Profile screen shows dungeon-styled cards
- [ ] Loot box screen shows chest sprites
- [ ] Opening a loot box shows progressive reveal
- [ ] Consumables display with correct sprites
- [ ] Theme can be switched in settings

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(theme): complete dungeon theme integration"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-3 | Theme foundation (colors, assets, integration) |
| 2 | 4-9 | Dungeon components (PixelSprite, DungeonCard, DungeonBar, ConsumableIcon, ChestReveal) |
| 3 | 10-11 | Loot box experience update |
| 4 | 12-16 | Screen updates (profile, collection, home, library, session-results) |
| 5 | 17 | Final testing |

Total: 17 tasks, ~50 steps
