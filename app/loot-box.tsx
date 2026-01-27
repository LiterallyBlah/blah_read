import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { storage } from '@/lib/storage';
import { openLootBox, getPoolCompanions } from '@/lib/lootBox';
import { LootBoxReveal } from '@/components/LootBoxReveal';
import type { Companion } from '@/lib/types';

export default function LootBoxScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const [revealing, setRevealing] = useState(false);
  const [revealedCompanion, setRevealedCompanion] = useState<Companion | null>(null);
  const [boxCount, setBoxCount] = useState(0);
  const styles = createStyles(colors, spacing, fontSize);

  useEffect(() => {
    loadBoxCount();
  }, []);

  async function loadBoxCount() {
    const progress = await storage.getProgress();
    setBoxCount(progress.lootBoxes.availableBoxes.length);
  }

  async function handleOpenBox() {
    if (revealing || boxCount === 0) return;
    setRevealing(true);

    const [books, progress] = await Promise.all([
      storage.getBooks(),
      storage.getProgress(),
    ]);

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
      setBoxCount(progress.lootBoxes.availableBoxes.length);
    } else {
      // No companion available (empty pool)
      const usedBox = progress.lootBoxes.availableBoxes.shift()!;
      progress.lootBoxes.openHistory.push({
        boxId: usedBox.id,
        openedAt: Date.now(),
        companionId: '',
      });
      await storage.saveProgress(progress);
      setBoxCount(progress.lootBoxes.availableBoxes.length);
    }

    setRevealing(false);
  }

  function handleDismiss() {
    setRevealedCompanion(null);
  }

  if (revealedCompanion) {
    return (
      <LootBoxReveal
        companion={revealedCompanion}
        onDismiss={handleDismiss}
        hasMoreBoxes={boxCount > 0}
        onOpenAnother={handleOpenBox}
      />
    );
  }

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
    marginBottom: spacing(6),
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
