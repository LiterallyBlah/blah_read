# Session Rewards Reveal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a tap-to-reveal sequence for companions and loot boxes after reading sessions.

**Architecture:** New route `/session-rewards-reveal` sits between timer and results. Companions revealed one-at-a-time with card flip animation. Loot boxes shown as summary (not opened). Timer navigates to reveal route, which then navigates to results.

**Tech Stack:** React Native, Expo Router, Animated API for card flip

---

## Task 1: Roll loot box tiers at earn time

Currently loot boxes are "blank" and tier is rolled at open time. We need tiers at earn time to show visuals in the summary.

**Files:**
- Modify: `lib/sessionRewards.ts:180-217`
- Modify: `lib/lootV3.ts` (export rollBoxTierWithPity)

**Step 1: Update processSessionEnd to roll tiers**

In `lib/sessionRewards.ts`, replace the loot box creation logic (lines 180-217):

```typescript
  // Step 8: Roll and create loot boxes with tiers
  const lootBoxes: LootBoxV3[] = [];
  let currentPityCounter = progress.goldPityCounter ?? 0;

  // Level up boxes
  const regularLevelsGained = levelResult.levelsGained;
  for (let i = 0; i < regularLevelsGained; i++) {
    const { tier, newPityCounter } = rollBoxTierWithPity(
      totalLuck,
      combinedActiveEffects.rareLuck,
      combinedActiveEffects.legendaryLuck,
      { goldPityCounter: currentPityCounter }
    );
    currentPityCounter = newPityCounter;
    lootBoxes.push({
      id: generateLootBoxId(),
      tier,
      earnedAt: now,
      source: 'level_up',
      bookId: book.id,
    });
  }

  // Completion bonus boxes
  for (let i = 0; i < completionBonusLevels; i++) {
    const { tier, newPityCounter } = rollBoxTierWithPity(
      totalLuck,
      combinedActiveEffects.rareLuck,
      combinedActiveEffects.legendaryLuck,
      { goldPityCounter: currentPityCounter }
    );
    currentPityCounter = newPityCounter;
    lootBoxes.push({
      id: generateLootBoxId(),
      tier,
      earnedAt: now,
      source: 'completion',
      bookId: book.id,
    });
  }

  // Step 9: Roll checkpoint drops (time-based to prevent exploit)
  const sessionMinutes = Math.floor(validSessionSeconds / 60);
  const bonusDropCount = rollCheckpointDrops(sessionMinutes, totalDropRateBoost);
  for (let i = 0; i < bonusDropCount; i++) {
    const { tier, newPityCounter } = rollBoxTierWithPity(
      totalLuck,
      combinedActiveEffects.rareLuck,
      combinedActiveEffects.legendaryLuck,
      { goldPityCounter: currentPityCounter }
    );
    currentPityCounter = newPityCounter;
    lootBoxes.push({
      id: generateLootBoxId(),
      tier,
      earnedAt: now,
      source: 'bonus_drop',
      bookId: book.id,
    });
  }
```

**Step 2: Add import for rollBoxTierWithPity**

At top of `lib/sessionRewards.ts`, update the import from lootV3:

```typescript
import { rollCheckpointDrops, rollBoxTierWithPity } from './lootV3';
```

**Step 3: Update pity counter in returned progress**

In the `updatedProgress` object creation (~line 249), add the new pity counter:

```typescript
  const updatedProgress: UserProgress = {
    ...progress,
    totalXp: progress.totalXp + xpGained,
    genreLevels: updatedGenreLevels,
    lootBoxesV3: [...existingLootBoxesV3, ...lootBoxes],
    activeConsumables: tickedConsumables,
    goldPityCounter: currentPityCounter,
  };
```

**Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add lib/sessionRewards.ts
git commit -m "feat: roll loot box tiers at earn time

Tiers are now determined when boxes are earned, not when opened.
This enables showing tier visuals in the session rewards reveal."
```

---

## Task 2: Add unlockedCompanions and lootBoxesEarned to SessionResultsData

**Files:**
- Modify: `lib/sessionResultsData.ts`

**Step 1: Update interface**

Add new fields to `SessionResultsData` interface:

```typescript
export interface SessionResultsData {
  // ... existing fields ...

  // Companions unlocked this session (for reveal/recap)
  unlockedCompanions: Array<{
    id: string;
    name: string;
    rarity: 'common' | 'rare' | 'legendary';
    type: 'character' | 'creature' | 'object';
    description: string;
    imageUrl: string | null;
  }>;

  // Loot boxes earned with tiers (for reveal/recap)
  lootBoxesEarned: Array<{
    id: string;
    tier: 'wood' | 'silver' | 'gold';
    source: 'level_up' | 'bonus_drop' | 'completion';
  }>;
}
```

**Step 2: Update buildSessionResultsData function**

Add the new fields to the returned object:

```typescript
export function buildSessionResultsData(
  result: SessionRewardResult,
  sessionSeconds: number,
  unlockedCompanions: Companion[],
  previousStreak: number,
  newStreak: number
): SessionResultsData {
  // ... existing code ...

  return {
    // ... existing fields ...

    // New fields for reveal/recap
    unlockedCompanions: unlockedCompanions.map(c => ({
      id: c.id,
      name: c.name,
      rarity: c.rarity,
      type: c.type,
      description: c.description,
      imageUrl: c.imageUrl,
    })),

    lootBoxesEarned: result.lootBoxes.map(lb => ({
      id: lb.id,
      tier: lb.tier!, // Now always defined since we roll at earn time
      source: lb.source,
    })),
  };
}
```

**Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add lib/sessionResultsData.ts
git commit -m "feat: add unlockedCompanions and lootBoxesEarned to session results data"
```

---

## Task 3: Create CompanionCardReveal component

**Files:**
- Create: `components/CompanionCardReveal.tsx`

**Step 1: Create the component**

```typescript
import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';

interface CompanionData {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'legendary';
  type: 'character' | 'creature' | 'object';
  description: string;
  imageUrl: string | null;
}

interface Props {
  companion: CompanionData;
  onComplete: () => void;
  isLast: boolean;
}

export function CompanionCardReveal({ companion, onComplete, isLast }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const rarityColors: Record<string, string> = {
    common: colors.rarityCommon,
    rare: colors.rarityRare,
    legendary: colors.rarityLegendary,
  };

  const handleTap = () => {
    if (revealed) return;

    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setRevealed(true);
    });
  };

  // Front of card (face-down) - visible when flipAnim is 0
  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '90deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  // Back of card (revealed) - visible when flipAnim is 1
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-90deg', '-90deg', '0deg'],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const rarityColor = rarityColors[companion.rarity] || colors.text;

  // Pulse animation for legendary
  const pulseAnim = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (companion.rarity === 'legendary' && !revealed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [companion.rarity, revealed]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable onPress={handleTap} style={styles.cardWrapper}>
        {/* Face-down card */}
        <Animated.View
          style={[
            styles.card,
            {
              borderColor: rarityColor,
              backgroundColor: colors.surface,
              transform: [{ rotateY: frontRotate }, { scale: companion.rarity === 'legendary' ? pulseAnim : 1 }],
              opacity: frontOpacity,
            },
          ]}
        >
          <Text style={[styles.questionMark, { color: rarityColor }]}>?</Text>
          <Text style={[styles.tapText, { color: colors.textMuted }]}>tap to reveal</Text>
        </Animated.View>

        {/* Revealed card */}
        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            {
              borderColor: rarityColor,
              backgroundColor: colors.surface,
              transform: [{ rotateY: backRotate }],
              opacity: backOpacity,
            },
          ]}
        >
          {companion.imageUrl ? (
            <Image source={{ uri: companion.imageUrl }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.background }]}>
              <Text style={[styles.placeholderText, { color: colors.textMuted }]}>?</Text>
            </View>
          )}

          <Text style={[styles.name, { color: colors.text }]}>{companion.name.toLowerCase()}</Text>
          <Text style={[styles.rarity, { color: rarityColor }]}>[{companion.rarity}]</Text>
          <Text style={[styles.type, { color: colors.textSecondary }]}>{companion.type}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{companion.description}</Text>
        </Animated.View>
      </Pressable>

      {revealed && (
        <Pressable style={[styles.button, { borderColor: colors.text }]} onPress={onComplete}>
          <Text style={[styles.buttonText, { color: colors.text }]}>
            [{isLast ? 'continue' : 'next'}]
          </Text>
        </Pressable>
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
  cardWrapper: {
    width: 280,
    height: 400,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    position: 'absolute',
  },
  questionMark: {
    fontFamily: FONTS.mono,
    fontSize: 120,
    fontWeight: FONTS.monoBold,
  },
  tapText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    marginTop: 24,
  },
  image: {
    width: 120,
    height: 120,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
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
    fontSize: 20,
    marginTop: 16,
    textAlign: 'center',
  },
  rarity: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 14,
    marginTop: 8,
  },
  type: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    marginTop: 4,
  },
  description: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    marginTop: 32,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 16,
  },
});
```

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add components/CompanionCardReveal.tsx
git commit -m "feat: add CompanionCardReveal component with card flip animation"
```

---

## Task 4: Create LootBoxSummary component

**Files:**
- Create: `components/LootBoxSummary.tsx`

**Step 1: Create the component**

```typescript
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { PixelSprite } from '@/components/dungeon/PixelSprite';
import type { LootBoxTier } from '@/lib/types';

interface LootBoxData {
  id: string;
  tier: LootBoxTier;
  source: 'level_up' | 'bonus_drop' | 'completion';
}

interface Props {
  boxes: LootBoxData[];
  onContinue: () => void;
}

const CHEST_TILES: Record<LootBoxTier, string> = {
  wood: 'chest_wood_closed',
  silver: 'chest_silver_closed',
  gold: 'chest_gold_closed',
};

export function LootBoxSummary({ boxes, onContinue }: Props) {
  const { colors, spacing, fontSize } = useTheme();

  const maxDisplay = 5;
  const displayBoxes = boxes.slice(0, maxDisplay);
  const overflow = boxes.length - maxDisplay;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>you earned loot!</Text>

      <View style={styles.boxesRow}>
        {displayBoxes.map((box) => (
          <View key={box.id} style={styles.boxItem}>
            <PixelSprite tile={CHEST_TILES[box.tier]} scale={3} />
          </View>
        ))}
        {overflow > 0 && (
          <View style={styles.overflowItem}>
            <Text style={[styles.overflowText, { color: colors.textSecondary }]}>+{overflow}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.subtext, { color: colors.textSecondary }]}>
        {boxes.length} box{boxes.length !== 1 ? 'es' : ''} added to inventory
      </Text>

      <Pressable style={[styles.button, { borderColor: colors.text }]} onPress={onContinue}>
        <Text style={[styles.buttonText, { color: colors.text }]}>[continue]</Text>
      </Pressable>
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
  header: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 24,
    marginBottom: 32,
  },
  boxesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  boxItem: {
    alignItems: 'center',
  },
  overflowItem: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 48,
  },
  overflowText: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 18,
  },
  subtext: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    marginBottom: 32,
  },
  button: {
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 16,
  },
});
```

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add components/LootBoxSummary.tsx
git commit -m "feat: add LootBoxSummary component for displaying earned boxes"
```

---

## Task 5: Create SessionRewardsReveal orchestrator component

**Files:**
- Create: `components/SessionRewardsReveal.tsx`

**Step 1: Create the component**

```typescript
import React, { useState } from 'react';
import { CompanionCardReveal } from './CompanionCardReveal';
import { LootBoxSummary } from './LootBoxSummary';
import type { LootBoxTier } from '@/lib/types';

interface CompanionData {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'legendary';
  type: 'character' | 'creature' | 'object';
  description: string;
  imageUrl: string | null;
}

interface LootBoxData {
  id: string;
  tier: LootBoxTier;
  source: 'level_up' | 'bonus_drop' | 'completion';
}

type RevealPhase =
  | { type: 'companions'; index: number }
  | { type: 'lootBoxes' }
  | { type: 'complete' };

interface Props {
  companions: CompanionData[];
  lootBoxes: LootBoxData[];
  onComplete: () => void;
}

export function SessionRewardsReveal({ companions, lootBoxes, onComplete }: Props) {
  const [phase, setPhase] = useState<RevealPhase>(() => {
    if (companions.length > 0) {
      return { type: 'companions', index: 0 };
    } else if (lootBoxes.length > 0) {
      return { type: 'lootBoxes' };
    } else {
      return { type: 'complete' };
    }
  });

  // Handle completion immediately if nothing to reveal
  React.useEffect(() => {
    if (phase.type === 'complete') {
      onComplete();
    }
  }, [phase, onComplete]);

  const handleCompanionComplete = () => {
    if (phase.type !== 'companions') return;

    const nextIndex = phase.index + 1;
    if (nextIndex < companions.length) {
      setPhase({ type: 'companions', index: nextIndex });
    } else if (lootBoxes.length > 0) {
      setPhase({ type: 'lootBoxes' });
    } else {
      setPhase({ type: 'complete' });
    }
  };

  const handleLootBoxContinue = () => {
    setPhase({ type: 'complete' });
  };

  if (phase.type === 'companions') {
    const companion = companions[phase.index];
    const isLast = phase.index === companions.length - 1 && lootBoxes.length === 0;
    return (
      <CompanionCardReveal
        companion={companion}
        onComplete={handleCompanionComplete}
        isLast={isLast}
      />
    );
  }

  if (phase.type === 'lootBoxes') {
    return <LootBoxSummary boxes={lootBoxes} onContinue={handleLootBoxContinue} />;
  }

  // Complete phase - render nothing, effect will call onComplete
  return null;
}
```

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add components/SessionRewardsReveal.tsx
git commit -m "feat: add SessionRewardsReveal orchestrator component"
```

---

## Task 6: Create session-rewards-reveal route

**Files:**
- Create: `app/session-rewards-reveal.tsx`

**Step 1: Create the route**

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SessionRewardsReveal } from '@/components/SessionRewardsReveal';
import { useTheme } from '@/lib/ThemeContext';

export default function SessionRewardsRevealRoute() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    companions: string;
    lootBoxes: string;
    resultsData: string;
    bookTitle: string;
  }>();

  const companions = JSON.parse(params.companions || '[]');
  const lootBoxes = JSON.parse(params.lootBoxes || '[]');
  const resultsData = params.resultsData || '{}';
  const bookTitle = params.bookTitle || 'Unknown Book';

  const handleComplete = () => {
    router.replace({
      pathname: '/session-results',
      params: {
        data: resultsData,
        bookTitle,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SessionRewardsReveal
        companions={companions}
        lootBoxes={lootBoxes}
        onComplete={handleComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/session-rewards-reveal.tsx
git commit -m "feat: add session-rewards-reveal route"
```

---

## Task 7: Update timer to navigate to reveal route

**Files:**
- Modify: `app/timer/[bookId].tsx:284-300`

**Step 1: Update navigation logic**

Replace the navigation code at the end of `handleEnd()`:

```typescript
    // Build session results data
    const resultsData = buildSessionResultsData(
      sessionResult,
      elapsed,
      unlockedCompanions,
      previousStreak,
      updatedProgress.currentStreak
    );

    debug.log('timer', 'Session end complete, navigating to rewards reveal');

    // Navigate to reveal screen if there are rewards, otherwise straight to results
    const hasRewardsToReveal = unlockedCompanions.length > 0 || sessionResult.lootBoxes.length > 0;

    if (hasRewardsToReveal) {
      router.replace({
        pathname: '/session-rewards-reveal',
        params: {
          companions: JSON.stringify(resultsData.unlockedCompanions),
          lootBoxes: JSON.stringify(resultsData.lootBoxesEarned),
          resultsData: JSON.stringify(resultsData),
          bookTitle: book.title,
        },
      });
    } else {
      router.replace({
        pathname: '/session-results',
        params: {
          data: JSON.stringify(resultsData),
          bookTitle: book.title,
        },
      });
    }
```

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/timer/[bookId].tsx
git commit -m "feat: navigate to rewards reveal after session ends"
```

---

## Task 8: Update SessionResultsScreen to show recap section

**Files:**
- Modify: `components/SessionResultsScreen.tsx`

**Step 1: Add recap section after rewards earned**

Add a new section to display unlocked companions and earned loot boxes. Insert after the "rewards earned" section (~line 73):

```typescript
        {/* Found This Session */}
        {(data.unlockedCompanions?.length > 0 || data.lootBoxesEarned?.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>found this session</Text>

            {/* Companions */}
            {data.unlockedCompanions?.map((companion) => (
              <View key={companion.id} style={styles.foundItem}>
                <Text style={[styles.foundName, { color: colors.text }]}>
                  {companion.name.toLowerCase()}
                </Text>
                <Text style={[
                  styles.foundRarity,
                  { color: companion.rarity === 'legendary' ? colors.rarityLegendary :
                           companion.rarity === 'rare' ? colors.rarityRare :
                           colors.rarityCommon }
                ]}>
                  [{companion.rarity}]
                </Text>
              </View>
            ))}

            {/* Loot boxes */}
            {data.lootBoxesEarned?.length > 0 && (
              <Text style={styles.progressItem}>
                {data.lootBoxesEarned.length} loot box{data.lootBoxesEarned.length !== 1 ? 'es' : ''} in inventory
              </Text>
            )}
          </View>
        )}
```

**Step 2: Add styles for the new section**

Add to the StyleSheet:

```typescript
    foundItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing(1),
      gap: spacing(2),
    },
    foundName: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
    },
    foundRarity: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      fontWeight: FONTS.monoBold,
    },
```

**Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add components/SessionResultsScreen.tsx
git commit -m "feat: add 'found this session' recap section to results screen"
```

---

## Task 9: Manual testing

**Step 1: Start the dev server**

Run: `npx expo start`

**Step 2: Test the flow**

1. Start a reading session on any book
2. Read for at least 30 seconds (or modify milestones temporarily for faster testing)
3. End the session
4. Verify: Companion card appears face-down with rarity glow
5. Tap the card to reveal
6. Verify: Card flips to show companion details
7. Tap "next" or "continue"
8. Verify: Loot box summary shows if boxes were earned
9. Tap "continue"
10. Verify: Session results screen shows with recap section

**Step 3: Final commit**

```bash
git add -A
git commit -m "test: verify session rewards reveal flow works end-to-end"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Roll loot box tiers at earn time | lib/sessionRewards.ts |
| 2 | Add companions/boxes to SessionResultsData | lib/sessionResultsData.ts |
| 3 | Create CompanionCardReveal component | components/CompanionCardReveal.tsx |
| 4 | Create LootBoxSummary component | components/LootBoxSummary.tsx |
| 5 | Create SessionRewardsReveal orchestrator | components/SessionRewardsReveal.tsx |
| 6 | Create reveal route | app/session-rewards-reveal.tsx |
| 7 | Update timer navigation | app/timer/[bookId].tsx |
| 8 | Add recap to results screen | components/SessionResultsScreen.tsx |
| 9 | Manual testing | - |
