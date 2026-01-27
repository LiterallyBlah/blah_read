import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { storage } from '@/lib/storage';
import type { Book, Companion, LootBoxState } from '@/lib/types';

type FilterType = 'all' | 'character' | 'creature' | 'object';
type RarityFilter = 'all' | 'common' | 'rare' | 'legendary';

export default function CollectionScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [lootBoxes, setLootBoxes] = useState<LootBoxState | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const [loadedBooks, progress] = await Promise.all([
      storage.getBooks(),
      storage.getProgress(),
    ]);
    setBooks(loadedBooks);
    setLootBoxes(progress.lootBoxes);
  }

  // Collect all unlocked companions
  const allCompanions = books.flatMap(book =>
    book.companions?.unlockedCompanions || []
  );

  // Apply filters
  const filtered = allCompanions.filter(c => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (rarityFilter !== 'all' && c.rarity !== rarityFilter) return false;
    return true;
  });

  // Stats - total possible companions across all books
  const totalPossible = books.reduce((sum, book) => {
    if (!book.companions) return sum;
    return sum +
      book.companions.readingTimeQueue.companions.length +
      book.companions.poolQueue.companions.length +
      book.companions.unlockedCompanions.length;
  }, 0);

  const boxCount = lootBoxes?.availableBoxes.length || 0;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>collection_</Text>
        <Text style={styles.stats}>
          {allCompanions.length}/{totalPossible} collected
        </Text>
      </View>

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
}: {
  companion: Companion;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
}) {
  const rarityColors: Record<string, string> = {
    common: colors.rarityCommon,
    rare: colors.rarityRare,
    legendary: colors.rarityLegendary,
  };

  const borderColor = rarityColors[companion.rarity] || colors.border;

  return (
    <View style={{
      width: '48%',
      marginBottom: spacing(4),
      padding: spacing(3),
      borderWidth: 1,
      borderColor: borderColor,
    }}>
      {companion.imageUrl ? (
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
        color: colors.text,
        fontFamily: FONTS.mono,
        fontSize: 12,
        marginBottom: spacing(1),
      }}>
        {companion.name.toLowerCase()}
      </Text>
      <Text style={{
        color: borderColor,
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
        {companion.source === 'discovered' ? 'discovered' : 'inspired'}
      </Text>
    </View>
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
  });
}
