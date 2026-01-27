import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, Image, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { storage } from '@/lib/storage';
import { settings } from '@/lib/settings';
import type { Book, Companion, LootBoxState } from '@/lib/types';

type FilterType = 'all' | 'character' | 'creature' | 'object';
type RarityFilter = 'all' | 'common' | 'rare' | 'legendary';

interface DisplayCompanion extends Companion {
  isLocked: boolean;
  bookTitle: string;
}

export default function CollectionScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [lootBoxes, setLootBoxes] = useState<LootBoxState | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [debugMode, setDebugMode] = useState(false);
  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const [loadedBooks, progress, config] = await Promise.all([
      storage.getBooks(),
      storage.getProgress(),
      settings.get(),
    ]);
    setBooks(loadedBooks);
    setLootBoxes(progress.lootBoxes);
    setDebugMode(config.debugMode);
  }

  // Collect companions based on debug mode
  const allCompanions: DisplayCompanion[] = books.flatMap(book => {
    if (!book.companions) return [];

    const unlocked: DisplayCompanion[] = book.companions.unlockedCompanions.map(c => ({
      ...c,
      isLocked: false,
      bookTitle: book.title,
    }));

    if (debugMode) {
      // In debug mode, also include locked companions from queues
      const lockedFromReadingQueue: DisplayCompanion[] = book.companions.readingTimeQueue.companions
        .filter(c => !c.unlockedAt)
        .map(c => ({
          ...c,
          isLocked: true,
          bookTitle: book.title,
        }));

      const lockedFromPoolQueue: DisplayCompanion[] = book.companions.poolQueue.companions
        .filter(c => !c.unlockedAt)
        .map(c => ({
          ...c,
          isLocked: true,
          bookTitle: book.title,
        }));

      return [...unlocked, ...lockedFromReadingQueue, ...lockedFromPoolQueue];
    }

    return unlocked;
  });

  // Apply filters
  const filtered = allCompanions.filter(c => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (rarityFilter !== 'all' && c.rarity !== rarityFilter) return false;
    return true;
  });

  // Debug: unlock a companion manually
  async function handleDebugUnlock(companion: DisplayCompanion) {
    const book = books.find(b => b.id === companion.bookId);
    if (!book?.companions) return;

    Alert.alert(
      'Debug Unlock',
      `Unlock "${companion.name}" from "${book.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            const unlockedCompanion: Companion = {
              ...companion,
              unlockMethod: 'reading_time',
              unlockedAt: Date.now(),
            };

            // Remove from queue and add to unlocked
            const updatedBook = { ...book };
            updatedBook.companions = { ...book.companions! };

            // Check reading time queue
            const rtIndex = updatedBook.companions.readingTimeQueue.companions.findIndex(c => c.id === companion.id);
            if (rtIndex !== -1) {
              updatedBook.companions.readingTimeQueue = {
                ...updatedBook.companions.readingTimeQueue,
                companions: updatedBook.companions.readingTimeQueue.companions.map((c, i) =>
                  i === rtIndex ? unlockedCompanion : c
                ),
              };
            }

            // Check pool queue
            const poolIndex = updatedBook.companions.poolQueue.companions.findIndex(c => c.id === companion.id);
            if (poolIndex !== -1) {
              updatedBook.companions.poolQueue = {
                ...updatedBook.companions.poolQueue,
                companions: updatedBook.companions.poolQueue.companions.map((c, i) =>
                  i === poolIndex ? unlockedCompanion : c
                ),
              };
            }

            // Add to unlocked companions
            updatedBook.companions.unlockedCompanions = [
              ...updatedBook.companions.unlockedCompanions,
              unlockedCompanion,
            ];

            await storage.saveBook(updatedBook);
            await loadData();
          },
        },
      ]
    );
  }

  // Stats - total possible companions across all books
  const totalPossible = books.reduce((sum, book) => {
    if (!book.companions) return sum;
    return sum +
      book.companions.readingTimeQueue.companions.length +
      book.companions.poolQueue.companions.length +
      book.companions.unlockedCompanions.length;
  }, 0);

  const unlockedCount = allCompanions.filter(c => !c.isLocked).length;
  const lockedCount = allCompanions.filter(c => c.isLocked).length;

  const boxCount = lootBoxes?.availableBoxes.length || 0;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>collection_</Text>
        <Text style={styles.stats}>
          {unlockedCount}/{totalPossible} collected
        </Text>
      </View>

      {/* Debug mode banner */}
      {debugMode && (
        <View style={styles.debugBanner}>
          <Text style={styles.debugBannerText}>
            debug mode: showing all {allCompanions.length} companions ({lockedCount} locked)
          </Text>
          <Text style={styles.debugHint}>tap locked companions to unlock</Text>
        </View>
      )}

      {/* Loot box prompt */}
      {boxCount > 0 && (
        <Pressable
          style={styles.lootBoxBanner}
          onPress={() => router.push('/loot-box')}
        >
          <Text style={styles.lootBoxText}>
            [ {boxCount} box{boxCount !== 1 ? 'es' : ''} to open ]
          </Text>
        </Pressable>
      )}

      {/* Type filter */}
      <View style={styles.filterRow}>
        {(['all', 'character', 'creature', 'object'] as FilterType[]).map(type => (
          <Pressable
            key={type}
            onPress={() => setTypeFilter(type)}
            style={[
              styles.filterButton,
              typeFilter === type && styles.filterButtonActive,
            ]}
          >
            <Text style={[
              styles.filterText,
              typeFilter === type && styles.filterTextActive,
            ]}>
              {type}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Rarity filter */}
      <View style={styles.filterRow}>
        {(['all', 'common', 'rare', 'legendary'] as RarityFilter[]).map(rarity => (
          <Pressable
            key={rarity}
            onPress={() => setRarityFilter(rarity)}
            style={[
              styles.filterButton,
              rarityFilter === rarity && styles.filterButtonActive,
            ]}
          >
            <Text style={[
              styles.filterText,
              rarityFilter === rarity && styles.filterTextActive,
            ]}>
              {rarity}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Companion grid */}
      <View style={styles.grid}>
        {filtered.map(companion => (
          <CompanionCard
            key={companion.id}
            companion={companion}
            colors={colors}
            spacing={spacing}
            onPress={companion.isLocked && debugMode ? () => handleDebugUnlock(companion) : undefined}
          />
        ))}
        {filtered.length === 0 && (
          <Text style={styles.emptyText}>
            no companions found_
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function CompanionCard({
  companion,
  colors,
  spacing,
  onPress,
}: {
  companion: DisplayCompanion;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  onPress?: () => void;
}) {
  const rarityColors: Record<string, string> = {
    common: colors.rarityCommon,
    rare: colors.rarityRare,
    legendary: colors.rarityLegendary,
  };

  const borderColor = companion.isLocked
    ? colors.border
    : (rarityColors[companion.rarity] || colors.border);

  const CardWrapper = onPress ? Pressable : View;

  return (
    <CardWrapper
      onPress={onPress}
      style={{
        width: '48%',
        marginBottom: spacing(4),
        padding: spacing(3),
        borderWidth: 1,
        borderColor: borderColor,
        borderStyle: companion.isLocked ? 'dashed' : 'solid',
        opacity: companion.isLocked ? 0.6 : 1,
      }}
    >
      {companion.isLocked ? (
        // Locked companion - show silhouette
        <View style={{
          width: '100%',
          aspectRatio: 1,
          marginBottom: spacing(2),
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{ color: colors.textMuted, fontFamily: FONTS.mono, fontSize: 24 }}>🔒</Text>
        </View>
      ) : companion.imageUrl ? (
        <Image
          source={{ uri: companion.imageUrl }}
          style={{
            width: '100%',
            aspectRatio: 1,
            marginBottom: spacing(2),
            backgroundColor: colors.surface,
          }}
          resizeMode="contain"
        />
      ) : (
        <View style={{
          width: '100%',
          aspectRatio: 1,
          marginBottom: spacing(2),
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{ color: colors.textMuted, fontFamily: FONTS.mono }}>?</Text>
        </View>
      )}
      <Text style={{
        color: companion.isLocked ? colors.textMuted : colors.text,
        fontFamily: FONTS.mono,
        fontSize: 12,
        marginBottom: spacing(1),
      }}>
        {companion.isLocked ? '???' : companion.name.toLowerCase()}
      </Text>
      <Text style={{
        color: companion.isLocked ? colors.textMuted : borderColor,
        fontFamily: FONTS.mono,
        fontSize: 10,
      }}>
        [{companion.rarity}] {companion.type}
      </Text>
      <Text style={{
        color: colors.textMuted,
        fontFamily: FONTS.mono,
        fontSize: 10,
        marginTop: spacing(1),
      }}>
        {companion.bookTitle.toLowerCase().substring(0, 20)}{companion.bookTitle.length > 20 ? '...' : ''}
      </Text>
    </CardWrapper>
  );
}

function createStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize'],
  letterSpacing: ReturnType<typeof useTheme>['letterSpacing']
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: spacing(6),
      paddingTop: spacing(16),
    },
    title: {
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('title'),
      letterSpacing: letterSpacing('normal'),
      color: colors.text,
      marginBottom: spacing(2),
    },
    stats: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      letterSpacing: letterSpacing('tight'),
      color: colors.textSecondary,
    },
    lootBoxBanner: {
      marginHorizontal: spacing(6),
      marginBottom: spacing(4),
      padding: spacing(4),
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    lootBoxText: {
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('body'),
      color: colors.text,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing(6),
      marginBottom: spacing(2),
      gap: spacing(2),
      flexWrap: 'wrap',
    },
    filterButton: {
      paddingHorizontal: spacing(3),
      paddingVertical: spacing(2),
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterButtonActive: {
      borderColor: colors.text,
    },
    filterText: {
      fontFamily: FONTS.mono,
      fontSize: 10,
      letterSpacing: letterSpacing('tight'),
      color: colors.textMuted,
    },
    filterTextActive: {
      color: colors.text,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: spacing(6),
      justifyContent: 'space-between',
    },
    emptyText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      letterSpacing: letterSpacing('tight'),
      color: colors.textMuted,
      width: '100%',
      textAlign: 'center',
      paddingVertical: spacing(8),
    },
    debugBanner: {
      marginHorizontal: spacing(6),
      marginBottom: spacing(4),
      padding: spacing(3),
      borderWidth: 1,
      borderColor: '#f59e0b',
      borderStyle: 'dashed',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
    debugBannerText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: '#f59e0b',
      textAlign: 'center',
    },
    debugHint: {
      fontFamily: FONTS.mono,
      fontSize: 10,
      color: '#f59e0b',
      textAlign: 'center',
      marginTop: spacing(1),
      opacity: 0.8,
    },
  });
}
