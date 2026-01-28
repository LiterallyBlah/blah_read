import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { storage } from '@/lib/storage';
import { openLootBox, getPoolCompanions } from '@/lib/lootBox';
import { LootBoxReveal } from '@/components/LootBoxReveal';
import type { Companion, LootBoxV3, LootBoxTier } from '@/lib/types';
import { rollLootForTier, LootResult } from '@/lib/lootV3';
import { ConsumableDefinition } from '@/lib/consumables';
import { addActiveConsumable } from '@/lib/consumableManager';

// Box tier visual styling
const TIER_STYLES: Record<LootBoxTier, { label: string; emoji: string }> = {
  wood: { label: 'wood', emoji: '' },
  silver: { label: 'silver', emoji: '' },
  gold: { label: 'gold', emoji: '' },
};

export default function LootBoxScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const [revealing, setRevealing] = useState(false);
  const [revealedCompanion, setRevealedCompanion] = useState<Companion | null>(null);
  const [revealedConsumable, setRevealedConsumable] = useState<ConsumableDefinition | null>(null);
  const [revealedTier, setRevealedTier] = useState<LootBoxTier | null>(null);
  const [boxCount, setBoxCount] = useState(0);
  const [boxesV3, setBoxesV3] = useState<LootBoxV3[]>([]);
  const styles = createStyles(colors, spacing, fontSize);

  useEffect(() => {
    loadBoxCount();
  }, []);

  async function loadBoxCount() {
    const progress = await storage.getProgress();
    // Support both V2 (lootBoxes) and V3 (lootBoxesV3) boxes
    const v2Count = progress.lootBoxes?.availableBoxes?.length || 0;
    const v3Boxes = progress.lootBoxesV3 || [];
    setBoxCount(v2Count + v3Boxes.length);
    setBoxesV3(v3Boxes);
  }

  async function handleOpenBox() {
    if (revealing || boxCount === 0) return;
    setRevealing(true);

    const [books, progress] = await Promise.all([
      storage.getBooks(),
      storage.getProgress(),
    ]);

    // Check if we have V3 boxes first
    const v3Boxes = progress.lootBoxesV3 || [];
    if (v3Boxes.length > 0) {
      // Open V3 box using new loot system
      const boxToOpen = v3Boxes[0];
      const lootResult = rollLootForTier(boxToOpen.tier);

      // Remove the opened box
      progress.lootBoxesV3 = v3Boxes.slice(1);

      if (lootResult.category === 'consumable' && lootResult.consumable) {
        // Handle consumable drop
        progress.activeConsumables = addActiveConsumable(
          progress.activeConsumables || [],
          lootResult.consumable
        );
        await storage.saveProgress(progress);

        setRevealedConsumable(lootResult.consumable);
        setRevealedTier(boxToOpen.tier);
        setRevealedCompanion(null);
      } else if (lootResult.category === 'companion' && lootResult.companionRarity) {
        // Handle companion drop - get from pool
        const currentBook = books
          .filter(b => b.status === 'reading')
          .sort((a, b) => b.totalReadingTime - a.totalReadingTime)[0];

        const pool = getPoolCompanions(books);
        const { companion } = openLootBox(pool, currentBook?.id || null);

        if (companion) {
          // Update book's companion state
          const book = books.find(b => b.id === companion.bookId);
          if (book?.companions) {
            const poolIndex = book.companions.poolQueue.companions.findIndex(
              c => c.id === companion.id
            );
            if (poolIndex !== -1) {
              book.companions.poolQueue.companions[poolIndex] = companion;
              book.companions.unlockedCompanions.push(companion);
              await storage.saveBook(book);
            }
          }

          await storage.saveProgress(progress);
          setRevealedCompanion(companion);
          setRevealedTier(boxToOpen.tier);
          setRevealedConsumable(null);
        } else {
          // No companion available - give a fallback consumable instead
          const fallbackConsumable = lootResult.consumable || {
            id: 'weak_xp_1',
            name: 'Minor XP Scroll',
            description: '+10% XP next session',
            tier: 'weak' as const,
            effectType: 'xp_boost' as const,
            magnitude: 0.10,
            duration: 1,
          };
          progress.activeConsumables = addActiveConsumable(
            progress.activeConsumables || [],
            fallbackConsumable
          );
          await storage.saveProgress(progress);

          setRevealedConsumable(fallbackConsumable);
          setRevealedTier(boxToOpen.tier);
          setRevealedCompanion(null);
        }
      }

      const newV3Count = (progress.lootBoxesV3?.length || 0);
      const v2Count = progress.lootBoxes?.availableBoxes?.length || 0;
      setBoxCount(v2Count + newV3Count);
      setBoxesV3(progress.lootBoxesV3 || []);
      setRevealing(false);
      return;
    }

    // Fallback to V2 boxes if no V3 boxes
    if (progress.lootBoxes.availableBoxes.length === 0) {
      setRevealing(false);
      return;
    }

    // Get current book (most recently read)
    const currentBook = books
      .filter(b => b.status === 'reading')
      .sort((a, b) => b.totalReadingTime - a.totalReadingTime)[0];

    // Get pool and open box
    const pool = getPoolCompanions(books);
    const { companion } = openLootBox(pool, currentBook?.id || null);

    if (companion) {
      // Update book's companion state
      const book = books.find(b => b.id === companion.bookId);
      if (book?.companions) {
        const poolIndex = book.companions.poolQueue.companions.findIndex(
          c => c.id === companion.id
        );
        if (poolIndex !== -1) {
          book.companions.poolQueue.companions[poolIndex] = companion;
          book.companions.unlockedCompanions.push(companion);
          await storage.saveBook(book);
        }
      }

      // Remove used box and record history
      const usedBox = progress.lootBoxes.availableBoxes.shift()!;
      progress.lootBoxes.openHistory.push({
        boxId: usedBox.id,
        openedAt: Date.now(),
        companionId: companion.id,
      });
      await storage.saveProgress(progress);

      setRevealedCompanion(companion);
      setRevealedTier(null); // V2 boxes don't have tiers
      setRevealedConsumable(null);
      setBoxCount(progress.lootBoxes.availableBoxes.length + (progress.lootBoxesV3?.length || 0));
    } else {
      // No companion available (empty pool)
      const usedBox = progress.lootBoxes.availableBoxes.shift()!;
      progress.lootBoxes.openHistory.push({
        boxId: usedBox.id,
        openedAt: Date.now(),
        companionId: '',
      });
      await storage.saveProgress(progress);
      setBoxCount(progress.lootBoxes.availableBoxes.length + (progress.lootBoxesV3?.length || 0));
    }

    setRevealing(false);
  }

  function handleDismiss() {
    setRevealedCompanion(null);
    setRevealedConsumable(null);
    setRevealedTier(null);
  }

  // Show reveal screen for companion or consumable
  if (revealedCompanion || revealedConsumable) {
    return (
      <LootBoxReveal
        companion={revealedCompanion}
        consumable={revealedConsumable}
        boxTier={revealedTier}
        onDismiss={handleDismiss}
        hasMoreBoxes={boxCount > 0}
        onOpenAnother={handleOpenBox}
      />
    );
  }

  // Get tier colors
  const getTierColor = (tier: LootBoxTier) => {
    switch (tier) {
      case 'gold': return colors.rarityLegendary;
      case 'silver': return colors.rarityRare;
      case 'wood': return colors.rarityCommon;
      default: return colors.text;
    }
  };

  // Group boxes by tier for display
  const tierCounts = boxesV3.reduce((acc, box) => {
    acc[box.tier] = (acc[box.tier] || 0) + 1;
    return acc;
  }, {} as Record<LootBoxTier, number>);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={[styles.backText, { color: colors.textSecondary }]}>{'<'} back</Text>
      </Pressable>

      <Text style={[styles.title, { color: colors.text }]}>loot_</Text>

      {boxCount > 0 ? (
        <>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {boxCount} box{boxCount !== 1 ? 'es' : ''} available
          </Text>

          {/* Show tier breakdown if there are V3 boxes */}
          {boxesV3.length > 0 && (
            <View style={styles.tierBreakdown}>
              {(['gold', 'silver', 'wood'] as LootBoxTier[]).map(tier => {
                const count = tierCounts[tier] || 0;
                if (count === 0) return null;
                return (
                  <Text
                    key={tier}
                    style={[styles.tierCount, { color: getTierColor(tier) }]}
                  >
                    {TIER_STYLES[tier].emoji} {count} {tier}
                  </Text>
                );
              })}
            </View>
          )}

          <Pressable
            style={[styles.openButton, { borderColor: colors.text }]}
            onPress={handleOpenBox}
            disabled={revealing}
          >
            <Text style={[styles.openButtonText, { color: colors.text }]}>
              {revealing ? '[ opening... ]' : '[ open box ]'}
            </Text>
          </Pressable>
        </>
      ) : (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          no boxes to open_
        </Text>
      )}
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
  backButton: {
    position: 'absolute',
    top: spacing(16),
    left: spacing(6),
  },
  backText: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
  },
  title: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('title'),
    marginBottom: spacing(8),
  },
  countText: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    marginBottom: spacing(4),
  },
  tierBreakdown: {
    flexDirection: 'row',
    gap: spacing(4),
    marginBottom: spacing(6),
  },
  tierCount: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
  },
  openButton: {
    borderWidth: 1,
    paddingVertical: spacing(5),
    paddingHorizontal: spacing(8),
    marginBottom: spacing(4),
  },
  openButtonText: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
  },
  emptyText: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    marginBottom: spacing(8),
  },
});
