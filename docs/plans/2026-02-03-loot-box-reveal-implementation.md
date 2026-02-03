# Loot Box Reveal Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the discrete state-machine loot box reveal with a smooth, timeline-based animation featuring particle effects, tier-based chest tinting, and rarity glow auras.

**Architecture:** Single progress value (0→1) drives all animations via interpolation. Components are composed: TintedChest, ParticleBurst, RisingItem with ItemGlow. Uses react-native-reanimated for performant, coordinated animations.

**Tech Stack:** React Native, Expo, react-native-reanimated, react-native-svg (for glow gradients)

---

## Task 1: Install Animation Dependencies

**Files:**
- Modify: `package.json`
- Modify: `babel.config.js`

**Step 1: Install react-native-reanimated and react-native-svg**

Run:
```bash
npx expo install react-native-reanimated react-native-svg
```

Expected: Packages added to package.json dependencies

**Step 2: Configure babel for reanimated**

Check `babel.config.js` - if it doesn't include reanimated plugin, update it:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

**Step 3: Verify installation**

Run:
```bash
npx expo start --clear
```

Expected: App starts without errors (press Ctrl+C after confirming)

**Step 4: Commit**

```bash
git add package.json babel.config.js package-lock.json
git commit -m "chore: add react-native-reanimated and react-native-svg"
```

---

## Task 2: Add Tier Color Constants

**Files:**
- Modify: `lib/dungeonAssets.ts`
- Modify: `__tests__/lib/dungeonAssets.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/dungeonAssets.test.ts`:

```typescript
import {
  // ... existing imports
  TIER_COLORS,
  getTierGlowColor,
} from '@/lib/dungeonAssets';

// Add at end of file:
describe('TIER_COLORS', () => {
  it('defines colors for all tiers', () => {
    expect(TIER_COLORS.wood).toBeDefined();
    expect(TIER_COLORS.silver).toBeDefined();
    expect(TIER_COLORS.gold).toBeDefined();
  });

  it('wood has no tint (null)', () => {
    expect(TIER_COLORS.wood.tint).toBeNull();
  });

  it('silver has gray-blue tint', () => {
    expect(TIER_COLORS.silver.tint).toBe('#A8B5C4');
    expect(TIER_COLORS.silver.tintOpacity).toBe(0.6);
  });

  it('gold has warm gold tint', () => {
    expect(TIER_COLORS.gold.tint).toBe('#FFD700');
    expect(TIER_COLORS.gold.tintOpacity).toBe(0.5);
  });

  it('defines glow colors for all tiers', () => {
    expect(TIER_COLORS.wood.glow).toBe('#8B7355');
    expect(TIER_COLORS.silver.glow).toBe('#C0C0C0');
    expect(TIER_COLORS.gold.glow).toBe('#FFD700');
  });
});

describe('getTierGlowColor', () => {
  it('returns correct glow color for each tier', () => {
    expect(getTierGlowColor('wood')).toBe('#8B7355');
    expect(getTierGlowColor('silver')).toBe('#C0C0C0');
    expect(getTierGlowColor('gold')).toBe('#FFD700');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern="dungeonAssets" -v`

Expected: FAIL - TIER_COLORS and getTierGlowColor not found

**Step 3: Write minimal implementation**

Add to `lib/dungeonAssets.ts` after the existing imports:

```typescript
// Tier color configuration for chest tinting and glow effects
export const TIER_COLORS: Record<LootBoxTier, {
  tint: string | null;
  tintOpacity: number;
  glow: string;
}> = {
  wood: {
    tint: null,           // No tint - natural brown
    tintOpacity: 0,
    glow: '#8B7355',      // Warm brown glow
  },
  silver: {
    tint: '#A8B5C4',      // Desaturated gray-blue
    tintOpacity: 0.6,
    glow: '#C0C0C0',      // Silver glow
  },
  gold: {
    tint: '#FFD700',      // Warm gold
    tintOpacity: 0.5,
    glow: '#FFD700',      // Gold glow
  },
};

export function getTierGlowColor(tier: LootBoxTier): string {
  return TIER_COLORS[tier].glow;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern="dungeonAssets" -v`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/dungeonAssets.ts __tests__/lib/dungeonAssets.test.ts
git commit -m "feat(dungeon): add tier color constants for chest tinting"
```

---

## Task 3: Create TintedChest Component

**Files:**
- Create: `components/dungeon/TintedChest.tsx`
- Create: `__tests__/components/dungeon/TintedChest.test.tsx`

**Step 1: Write the failing test**

Create `__tests__/components/dungeon/TintedChest.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { TintedChest } from '@/components/dungeon/TintedChest';

// Mock the image assets
jest.mock('@/lib/dungeonAssets', () => ({
  DUNGEON_TILES: {
    chest_wood_closed: 1,
    chest_silver_closed: 2,
    chest_gold_closed: 3,
    chest_open: 4,
  },
  CHEST_TILES: {
    wood: { closed: 'chest_wood_closed', open: 'chest_open' },
    silver: { closed: 'chest_silver_closed', open: 'chest_open' },
    gold: { closed: 'chest_gold_closed', open: 'chest_open' },
  },
  TIER_COLORS: {
    wood: { tint: null, tintOpacity: 0, glow: '#8B7355' },
    silver: { tint: '#A8B5C4', tintOpacity: 0.6, glow: '#C0C0C0' },
    gold: { tint: '#FFD700', tintOpacity: 0.5, glow: '#FFD700' },
  },
}));

describe('TintedChest', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(
      <TintedChest tier="wood" isOpen={false} testID="chest" />
    );
    expect(getByTestId('chest')).toBeTruthy();
  });

  it('renders closed state', () => {
    const { getByTestId } = render(
      <TintedChest tier="silver" isOpen={false} testID="chest" />
    );
    expect(getByTestId('chest')).toBeTruthy();
  });

  it('renders open state', () => {
    const { getByTestId } = render(
      <TintedChest tier="gold" isOpen={true} testID="chest" />
    );
    expect(getByTestId('chest')).toBeTruthy();
  });

  it('accepts glowIntensity prop', () => {
    const { getByTestId } = render(
      <TintedChest tier="gold" isOpen={false} glowIntensity={0.8} testID="chest" />
    );
    expect(getByTestId('chest')).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern="TintedChest" -v`

Expected: FAIL - Cannot find module

**Step 3: Write minimal implementation**

Create `components/dungeon/TintedChest.tsx`:

```typescript
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { DUNGEON_TILES, CHEST_TILES, TIER_COLORS } from '@/lib/dungeonAssets';
import type { LootBoxTier } from '@/lib/types';

interface TintedChestProps {
  tier: LootBoxTier;
  isOpen: boolean;
  glowIntensity?: number;
  scale?: number;
  testID?: string;
}

const BASE_SIZE = 16;

export function TintedChest({
  tier,
  isOpen,
  glowIntensity = 0,
  scale = 4,
  testID,
}: TintedChestProps) {
  const size = BASE_SIZE * scale;
  const tileKey = isOpen ? CHEST_TILES[tier].open : CHEST_TILES[tier].closed;
  const source = DUNGEON_TILES[tileKey];
  const tierConfig = TIER_COLORS[tier];

  return (
    <View testID={testID} style={[styles.container, { width: size, height: size }]}>
      {/* Glow layer underneath */}
      {glowIntensity > 0 && (
        <View
          style={[
            styles.glow,
            {
              backgroundColor: tierConfig.glow,
              opacity: glowIntensity * 0.5,
              width: size * 1.5,
              height: size * 1.5,
              borderRadius: size * 0.75,
            },
          ]}
        />
      )}

      {/* Base chest image */}
      <Image
        source={source}
        style={[styles.image, { width: size, height: size }]}
        resizeMode="stretch"
      />

      {/* Tint overlay for silver/gold */}
      {tierConfig.tint && !isOpen && (
        <View
          style={[
            styles.tintOverlay,
            {
              backgroundColor: tierConfig.tint,
              opacity: tierConfig.tintOpacity,
              width: size,
              height: size,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  image: {
    zIndex: 1,
  },
  tintOverlay: {
    position: 'absolute',
    zIndex: 2,
  },
});
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern="TintedChest" -v`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add components/dungeon/TintedChest.tsx __tests__/components/dungeon/TintedChest.test.tsx
git commit -m "feat(dungeon): add TintedChest component with tier coloring"
```

---

## Task 4: Create ParticleBurst Component

**Files:**
- Create: `components/dungeon/ParticleBurst.tsx`
- Create: `__tests__/components/dungeon/ParticleBurst.test.tsx`

**Step 1: Write the failing test**

Create `__tests__/components/dungeon/ParticleBurst.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { ParticleBurst } from '@/components/dungeon/ParticleBurst';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

describe('ParticleBurst', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(
      <ParticleBurst active={false} color="#FFD700" testID="burst" />
    );
    expect(getByTestId('burst')).toBeTruthy();
  });

  it('renders correct number of particles', () => {
    const { getByTestId } = render(
      <ParticleBurst active={true} color="#FFD700" particleCount={8} testID="burst" />
    );
    expect(getByTestId('burst')).toBeTruthy();
  });

  it('accepts custom size', () => {
    const { getByTestId } = render(
      <ParticleBurst active={true} color="#C0C0C0" size={100} testID="burst" />
    );
    expect(getByTestId('burst')).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern="ParticleBurst" -v`

Expected: FAIL - Cannot find module

**Step 3: Write minimal implementation**

Create `components/dungeon/ParticleBurst.tsx`:

```typescript
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface ParticleBurstProps {
  active: boolean;
  color: string;
  particleCount?: number;
  size?: number;
  testID?: string;
}

interface ParticleProps {
  index: number;
  total: number;
  active: boolean;
  color: string;
  size: number;
}

function Particle({ index, total, active, color, size }: ParticleProps) {
  const progress = useSharedValue(0);

  // Calculate angle for this particle (evenly distributed)
  const angle = (index / total) * Math.PI * 2;
  const distance = size * 0.6;

  useEffect(() => {
    if (active) {
      // Stagger start times for organic feel
      const delay = index * 30;
      progress.value = withDelay(
        delay,
        withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) })
      );
    } else {
      progress.value = 0;
    }
  }, [active, index]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const x = Math.cos(angle) * distance * p;
    const y = Math.sin(angle) * distance * p - p * 20; // Rise up slightly
    const scale = 1 - p * 0.5;
    const opacity = 1 - p;

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale },
        { rotate: `${p * 180}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

export function ParticleBurst({
  active,
  color,
  particleCount = 10,
  size = 80,
  testID,
}: ParticleBurstProps) {
  return (
    <View testID={testID} style={[styles.container, { width: size, height: size }]}>
      {Array.from({ length: particleCount }).map((_, i) => (
        <Particle
          key={i}
          index={i}
          total={particleCount}
          active={active}
          color={color}
          size={size}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern="ParticleBurst" -v`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add components/dungeon/ParticleBurst.tsx __tests__/components/dungeon/ParticleBurst.test.tsx
git commit -m "feat(dungeon): add ParticleBurst component for chest open effect"
```

---

## Task 5: Create ItemGlow Component

**Files:**
- Create: `components/dungeon/ItemGlow.tsx`
- Create: `__tests__/components/dungeon/ItemGlow.test.tsx`

**Step 1: Write the failing test**

Create `__tests__/components/dungeon/ItemGlow.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { ItemGlow } from '@/components/dungeon/ItemGlow';

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    Svg: ({ children, ...props }: any) => React.createElement('Svg', props, children),
    Defs: ({ children, ...props }: any) => React.createElement('Defs', props, children),
    RadialGradient: ({ children, ...props }: any) => React.createElement('RadialGradient', props, children),
    Stop: (props: any) => React.createElement('Stop', props),
    Rect: (props: any) => React.createElement('Rect', props),
  };
});

describe('ItemGlow', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(
      <ItemGlow rarity="common" intensity={0.5} testID="glow" />
    );
    expect(getByTestId('glow')).toBeTruthy();
  });

  it('renders for all rarities', () => {
    const { rerender, getByTestId } = render(
      <ItemGlow rarity="common" intensity={0.5} testID="glow" />
    );
    expect(getByTestId('glow')).toBeTruthy();

    rerender(<ItemGlow rarity="rare" intensity={0.5} testID="glow" />);
    expect(getByTestId('glow')).toBeTruthy();

    rerender(<ItemGlow rarity="legendary" intensity={0.5} testID="glow" />);
    expect(getByTestId('glow')).toBeTruthy();
  });

  it('accepts custom size', () => {
    const { getByTestId } = render(
      <ItemGlow rarity="legendary" intensity={1} size={120} testID="glow" />
    );
    expect(getByTestId('glow')).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern="ItemGlow" -v`

Expected: FAIL - Cannot find module

**Step 3: Write minimal implementation**

Create `components/dungeon/ItemGlow.tsx`:

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import type { CompanionRarity } from '@/lib/types';

interface ItemGlowProps {
  rarity: CompanionRarity;
  intensity: number;
  size?: number;
  testID?: string;
}

// Glow configuration per rarity
const RARITY_GLOW: Record<CompanionRarity, { color: string; baseSize: number; baseOpacity: number }> = {
  common: {
    color: '#A0A0A0',
    baseSize: 40,
    baseOpacity: 0.3,
  },
  rare: {
    color: '#4A90D9',
    baseSize: 60,
    baseOpacity: 0.5,
  },
  legendary: {
    color: '#FFD700',
    baseSize: 80,
    baseOpacity: 0.7,
  },
};

export function ItemGlow({ rarity, intensity, size, testID }: ItemGlowProps) {
  const config = RARITY_GLOW[rarity];
  const glowSize = size ?? config.baseSize;
  const opacity = config.baseOpacity * intensity;

  if (intensity <= 0) {
    return null;
  }

  return (
    <View testID={testID} style={[styles.container, { width: glowSize, height: glowSize }]}>
      <Svg width={glowSize} height={glowSize} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={config.color} stopOpacity={opacity} />
            <Stop offset="100%" stopColor={config.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={glowSize} height={glowSize} fill="url(#glow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern="ItemGlow" -v`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add components/dungeon/ItemGlow.tsx __tests__/components/dungeon/ItemGlow.test.tsx
git commit -m "feat(dungeon): add ItemGlow component for rarity aura effect"
```

---

## Task 6: Create Animation Timeline Hook

**Files:**
- Create: `hooks/useRevealTimeline.ts`
- Create: `__tests__/hooks/useRevealTimeline.test.ts`

**Step 1: Write the failing test**

Create `__tests__/hooks/useRevealTimeline.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useRevealTimeline, TIMELINE } from '@/hooks/useRevealTimeline';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (value: number) => value,
    withSequence: (...args: any[]) => args[args.length - 1],
  };
});

describe('useRevealTimeline', () => {
  describe('TIMELINE constants', () => {
    it('defines all timeline events', () => {
      expect(TIMELINE.SHAKE_START).toBe(0);
      expect(TIMELINE.SHAKE_END).toBe(400);
      expect(TIMELINE.CHEST_OPEN).toBe(400);
      expect(TIMELINE.PARTICLES_START).toBe(400);
      expect(TIMELINE.ITEM_RISE_START).toBe(500);
      expect(TIMELINE.ITEM_RISE_END).toBe(800);
      expect(TIMELINE.GLOW_START).toBe(600);
      expect(TIMELINE.NAME_FADE_IN).toBe(800);
      expect(TIMELINE.DETAILS_FADE_IN).toBe(1000);
      expect(TIMELINE.BUTTONS_FADE_IN).toBe(1200);
      expect(TIMELINE.TOTAL_DURATION).toBe(1200);
    });
  });

  describe('useRevealTimeline hook', () => {
    it('returns initial state as idle', () => {
      const { result } = renderHook(() => useRevealTimeline());
      expect(result.current.state).toBe('idle');
    });

    it('provides start function', () => {
      const { result } = renderHook(() => useRevealTimeline());
      expect(typeof result.current.start).toBe('function');
    });

    it('provides reset function', () => {
      const { result } = renderHook(() => useRevealTimeline());
      expect(typeof result.current.reset).toBe('function');
    });

    it('provides progress shared value', () => {
      const { result } = renderHook(() => useRevealTimeline());
      expect(result.current.progress).toBeDefined();
      expect(typeof result.current.progress.value).toBe('number');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern="useRevealTimeline" -v`

Expected: FAIL - Cannot find module

**Step 3: Write minimal implementation**

Create `hooks/useRevealTimeline.ts`:

```typescript
import { useState, useCallback } from 'react';
import {
  useSharedValue,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

// Timeline events in milliseconds
export const TIMELINE = {
  SHAKE_START: 0,
  SHAKE_END: 400,
  CHEST_OPEN: 400,
  PARTICLES_START: 400,
  ITEM_RISE_START: 500,
  ITEM_RISE_END: 800,
  GLOW_START: 600,
  NAME_FADE_IN: 800,
  DETAILS_FADE_IN: 1000,
  BUTTONS_FADE_IN: 1200,
  TOTAL_DURATION: 1200,
} as const;

export type RevealState = 'idle' | 'shaking' | 'revealing' | 'complete';

export function useRevealTimeline() {
  const [state, setState] = useState<RevealState>('idle');
  const progress = useSharedValue(0);

  const setStateJS = useCallback((newState: RevealState) => {
    setState(newState);
  }, []);

  const start = useCallback(() => {
    setState('shaking');

    // Animate progress from 0 to 1 over the total duration
    progress.value = withSequence(
      // Shake phase (0 to 0.33 over 400ms)
      withTiming(TIMELINE.SHAKE_END / TIMELINE.TOTAL_DURATION, {
        duration: TIMELINE.SHAKE_END,
        easing: Easing.linear,
      }),
      // Reveal phase (0.33 to 1 over remaining time)
      withTiming(1, {
        duration: TIMELINE.TOTAL_DURATION - TIMELINE.SHAKE_END,
        easing: Easing.out(Easing.quad),
      })
    );

    // Update state at key points
    setTimeout(() => {
      setState('revealing');
    }, TIMELINE.SHAKE_END);

    setTimeout(() => {
      setState('complete');
    }, TIMELINE.TOTAL_DURATION);
  }, []);

  const reset = useCallback(() => {
    progress.value = 0;
    setState('idle');
  }, []);

  return {
    state,
    progress,
    start,
    reset,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern="useRevealTimeline" -v`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add hooks/useRevealTimeline.ts __tests__/hooks/useRevealTimeline.test.ts
git commit -m "feat(hooks): add useRevealTimeline hook for coordinated animations"
```

---

## Task 7: Rewrite ChestReveal Component

**Files:**
- Modify: `components/dungeon/ChestReveal.tsx`

**Step 1: Back up existing implementation**

Run:
```bash
cp components/dungeon/ChestReveal.tsx components/dungeon/ChestReveal.backup.tsx
```

**Step 2: Rewrite ChestReveal with timeline-based animation**

Replace `components/dungeon/ChestReveal.tsx` with:

```typescript
import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { TintedChest } from './TintedChest';
import { ParticleBurst } from './ParticleBurst';
import { ItemGlow } from './ItemGlow';
import { ConsumableIcon } from './ConsumableIcon';
import { useRevealTimeline, TIMELINE } from '@/hooks/useRevealTimeline';
import { getTierGlowColor } from '@/lib/dungeonAssets';
import type { LootBoxTier, Companion, CompanionRarity } from '@/lib/types';
import type { ConsumableDefinition } from '@/lib/consumables';

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
  const { state, progress, start, reset } = useRevealTimeline();

  const tierColor = {
    wood: colors.rarityCommon,
    silver: colors.rarityRare,
    gold: colors.rarityLegendary,
  }[tier];

  const itemRarity: CompanionRarity = companion?.rarity ??
    (consumable?.tier === 'strong' ? 'legendary' :
     consumable?.tier === 'medium' ? 'rare' : 'common');

  const handleTap = () => {
    if (state === 'idle') {
      start();
    }
  };

  const handleOpenAnother = () => {
    reset();
    onOpenAnother();
  };

  // Animated styles derived from progress
  const shakeStyle = useAnimatedStyle(() => {
    const shakeProgress = interpolate(
      progress.value,
      [0, 0.1, 0.2, 0.3, 0.33],
      [0, 1, -1, 1, 0],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ rotate: `${shakeProgress * 3}deg` }],
    };
  });

  const glowIntensityStyle = useAnimatedStyle(() => {
    // Glow pulses during shake, then fades
    const glowPhase = interpolate(
      progress.value,
      [0, 0.15, 0.33, 0.5],
      [0.3, 0.8, 1, 0],
      Extrapolation.CLAMP
    );
    return { opacity: glowPhase };
  });

  const itemRiseStyle = useAnimatedStyle(() => {
    const riseStart = TIMELINE.ITEM_RISE_START / TIMELINE.TOTAL_DURATION;
    const riseEnd = TIMELINE.ITEM_RISE_END / TIMELINE.TOTAL_DURATION;

    const translateY = interpolate(
      progress.value,
      [riseStart, riseEnd],
      [40, 0],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      progress.value,
      [riseStart, riseStart + 0.05],
      [0, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      progress.value,
      [riseStart, riseEnd * 0.9, riseEnd],
      [0.8, 1.05, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  const itemGlowStyle = useAnimatedStyle(() => {
    const glowStart = TIMELINE.GLOW_START / TIMELINE.TOTAL_DURATION;
    const opacity = interpolate(
      progress.value,
      [glowStart, glowStart + 0.1],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const nameFadeStyle = useAnimatedStyle(() => {
    const fadeStart = TIMELINE.NAME_FADE_IN / TIMELINE.TOTAL_DURATION;
    const opacity = interpolate(
      progress.value,
      [fadeStart, fadeStart + 0.08],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const detailsFadeStyle = useAnimatedStyle(() => {
    const fadeStart = TIMELINE.DETAILS_FADE_IN / TIMELINE.TOTAL_DURATION;
    const opacity = interpolate(
      progress.value,
      [fadeStart, fadeStart + 0.08],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const buttonsFadeStyle = useAnimatedStyle(() => {
    const fadeStart = TIMELINE.BUTTONS_FADE_IN / TIMELINE.TOTAL_DURATION;
    const opacity = interpolate(
      progress.value,
      [fadeStart, fadeStart + 0.08],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const isOpen = state === 'revealing' || state === 'complete';
  const showParticles = state === 'revealing' || state === 'complete';
  const showItem = state === 'revealing' || state === 'complete';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Chest area */}
      <Pressable onPress={handleTap} style={styles.chestArea}>
        <Animated.View style={shakeStyle}>
          <TintedChest
            tier={tier}
            isOpen={isOpen}
            glowIntensity={state === 'shaking' ? 0.8 : state === 'idle' ? 0.3 : 0}
            scale={4}
          />
        </Animated.View>

        {/* Particle burst */}
        <ParticleBurst
          active={showParticles}
          color={getTierGlowColor(tier)}
          particleCount={10}
          size={120}
        />

        {state === 'idle' && (
          <Text style={[styles.tapText, { color: colors.textMuted }]}>
            tap to open
          </Text>
        )}
      </Pressable>

      {/* Item reveal */}
      {showItem && (
        <View style={styles.itemReveal}>
          {/* Item with glow */}
          <Animated.View style={[styles.itemContainer, itemRiseStyle]}>
            <Animated.View style={[styles.glowContainer, itemGlowStyle]}>
              <ItemGlow rarity={itemRarity} intensity={1} />
            </Animated.View>

            {category === 'consumable' && consumable && (
              <ConsumableIcon effectType={consumable.effectType} tier={consumable.tier} />
            )}

            {category === 'companion' && companion?.imageUrl && (
              <Image
                source={{ uri: companion.imageUrl }}
                style={styles.companionImage}
                resizeMode="contain"
              />
            )}
          </Animated.View>

          {/* Item details */}
          <Animated.View style={nameFadeStyle}>
            <Text style={[styles.tierLabel, { color: tierColor }]}>
              [{TIER_LABELS[tier]}]
            </Text>
            <Text style={[styles.itemName, { color: colors.text }]}>
              {consumable?.name.toLowerCase() ?? companion?.name.toLowerCase()}
            </Text>
          </Animated.View>

          <Animated.View style={detailsFadeStyle}>
            <Text style={[styles.itemRarity, { color: tierColor }]}>
              [{consumable?.tier ?? companion?.rarity}]
            </Text>
            <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
              {consumable?.description ?? companion?.description}
            </Text>
          </Animated.View>

          {/* Action buttons */}
          <Animated.View style={[styles.buttons, buttonsFadeStyle]}>
            {hasMoreBoxes && (
              <Pressable
                style={[styles.primaryButton, { borderColor: colors.text }]}
                onPress={handleOpenAnother}
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
          </Animated.View>
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
  itemReveal: {
    alignItems: 'center',
    marginTop: 16,
  },
  itemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  tierLabel: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  itemName: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 18,
    textAlign: 'center',
  },
  itemRarity: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  itemDesc: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 250,
    lineHeight: 18,
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

**Step 3: Verify app compiles**

Run:
```bash
npx expo export --platform ios 2>&1 | tail -5
```

Expected: Build completes successfully

**Step 4: Delete backup file**

Run:
```bash
rm components/dungeon/ChestReveal.backup.tsx
```

**Step 5: Commit**

```bash
git add components/dungeon/ChestReveal.tsx
git commit -m "feat(dungeon): rewrite ChestReveal with timeline-based animation"
```

---

## Task 8: Manual Testing & Polish

**Files:**
- Potentially: `components/dungeon/ChestReveal.tsx` (tweaks)

**Step 1: Test in simulator**

Run:
```bash
npx expo start
```

Open on iOS simulator or device. Navigate to loot box screen and test:

- [ ] Tap closed chest → shake animation plays
- [ ] Chest opens with particle burst
- [ ] Item rises smoothly from chest
- [ ] Glow appears behind item
- [ ] Text fades in sequentially
- [ ] Buttons fade in last
- [ ] "Open another" resets animation
- [ ] All three tiers display correct colors

**Step 2: Adjust timing if needed**

If animations feel off, adjust `TIMELINE` constants in `hooks/useRevealTimeline.ts`.

**Step 3: Final commit**

```bash
git add -A
git commit -m "polish: fine-tune loot box reveal animation timing"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Install dependencies | package.json, babel.config.js |
| 2 | Add tier color constants | lib/dungeonAssets.ts |
| 3 | Create TintedChest | components/dungeon/TintedChest.tsx |
| 4 | Create ParticleBurst | components/dungeon/ParticleBurst.tsx |
| 5 | Create ItemGlow | components/dungeon/ItemGlow.tsx |
| 6 | Create timeline hook | hooks/useRevealTimeline.ts |
| 7 | Rewrite ChestReveal | components/dungeon/ChestReveal.tsx |
| 8 | Manual testing | - |
