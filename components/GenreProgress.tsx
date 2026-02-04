import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, FONTS } from '@/lib/ui';
import { GENRES, GENRE_DISPLAY_NAMES, Genre, GenreLevels } from '@/lib/shared';
import { DungeonBar } from '@/components/dungeon';

// Threshold constants
const RARE_THRESHOLD = 10;
const LEGENDARY_THRESHOLD = 20;

interface Props {
  genreLevels: GenreLevels;
}

export function GenreProgress({ genreLevels }: Props) {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  // Sort genres by level (highest first), only show genres with level > 0
  const sortedGenres = GENRES
    .map(genre => ({ genre, level: genreLevels[genre] || 0 }))
    .filter(({ level }) => level > 0)
    .sort((a, b) => b.level - a.level);

  // If no genres have been leveled, show empty state
  if (sortedGenres.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>genre levels_</Text>
        <Text style={styles.emptyText}>no genre progress yet_</Text>
      </View>
    );
  }

  const topGenre = sortedGenres[0];
  const remainingGenres = sortedGenres.slice(1);

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.sectionTitle}>genre levels_</Text>
        <Text style={styles.expandIcon}>{expanded ? '[-]' : '[+]'}</Text>
      </Pressable>

      {/* Always show top genre with full detail */}
      <GenreItem
        genre={topGenre.genre}
        level={topGenre.level}
        styles={styles}
        colors={colors}
        isTop
      />

      {/* Show remaining genres when expanded */}
      {expanded && remainingGenres.length > 0 && (
        <View style={styles.genreList}>
          {remainingGenres.map(({ genre, level }) => (
            <GenreItem
              key={genre}
              genre={genre}
              level={level}
              styles={styles}
              colors={colors}
            />
          ))}
        </View>
      )}

      {/* Legend for thresholds */}
      {expanded && (
        <View style={styles.legend}>
          <Text style={styles.legendText}>
            <Text style={[styles.legendLabel, { color: colors.rarityRare }]}>[rare]</Text>
            {' '}unlocks at lv.{RARE_THRESHOLD}
          </Text>
          <Text style={styles.legendText}>
            <Text style={[styles.legendLabel, { color: colors.rarityLegendary }]}>[legendary]</Text>
            {' '}unlocks at lv.{LEGENDARY_THRESHOLD}
          </Text>
        </View>
      )}
    </View>
  );
}

interface GenreItemProps {
  genre: Genre;
  level: number;
  styles: ReturnType<typeof createStyles>;
  colors: any;
  isTop?: boolean;
}

function GenreItem({ genre, level, styles, colors, isTop }: GenreItemProps) {
  const rareUnlocked = level >= RARE_THRESHOLD;
  const legendaryUnlocked = level >= LEGENDARY_THRESHOLD;

  // Calculate progress to next threshold
  const nextThreshold = level < RARE_THRESHOLD
    ? RARE_THRESHOLD
    : level < LEGENDARY_THRESHOLD
      ? LEGENDARY_THRESHOLD
      : null;

  const progressValue = nextThreshold
    ? level - (nextThreshold === LEGENDARY_THRESHOLD ? RARE_THRESHOLD : 0)
    : level;
  const progressMax = nextThreshold
    ? nextThreshold - (nextThreshold === LEGENDARY_THRESHOLD ? RARE_THRESHOLD : 0)
    : LEGENDARY_THRESHOLD;

  return (
    <View style={[styles.genreItem, isTop && styles.genreItemTop]}>
      <View style={styles.genreHeader}>
        <Text style={styles.genreLevel}>{level}</Text>
        <Text style={styles.genreName}>
          {GENRE_DISPLAY_NAMES[genre].toLowerCase()}
        </Text>
        <View style={styles.thresholdBadges}>
          {rareUnlocked && (
            <Text style={[styles.badge, { color: colors.rarityRare }]}>[rare]</Text>
          )}
          {legendaryUnlocked && (
            <Text style={[styles.badge, { color: colors.rarityLegendary }]}>[legendary]</Text>
          )}
        </View>
      </View>

      {/* Progress bar toward next threshold */}
      {nextThreshold && (
        <View style={styles.progressSection}>
          <DungeonBar
            value={progressValue}
            max={progressMax}
            color={nextThreshold === LEGENDARY_THRESHOLD ? 'amber' : 'green'}
            height={4}
          />
          <Text style={styles.progressText}>
            {nextThreshold - level} to {nextThreshold === LEGENDARY_THRESHOLD ? 'legendary' : 'rare'}
          </Text>
        </View>
      )}

      {/* Maxed out state */}
      {!nextThreshold && (
        <Text style={styles.maxedText}>max threshold reached</Text>
      )}
    </View>
  );
}

type FontSize = 'micro' | 'small' | 'body' | 'large' | 'title' | 'hero';
type LetterSpacingSize = 'tight' | 'normal' | 'wide' | 'hero';

function createStyles(
  colors: any,
  spacing: (n: number) => number,
  fontSize: (size: FontSize) => number,
  letterSpacing: (size: LetterSpacingSize) => number
) {
  return StyleSheet.create({
    container: {
      marginBottom: spacing(8),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing(2),
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      letterSpacing: letterSpacing('tight'),
    },
    expandIcon: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    genreList: {
      marginTop: spacing(2),
      gap: spacing(2),
    },
    genreItem: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing(3),
    },
    genreItemTop: {
      borderColor: colors.success,
    },
    genreHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(2),
    },
    genreLevel: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('large'),
      minWidth: 28,
      textAlign: 'right',
    },
    genreName: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
      flex: 1,
    },
    thresholdBadges: {
      flexDirection: 'row',
      gap: spacing(1),
    },
    badge: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
    },
    progressSection: {
      marginTop: spacing(2),
    },
    progressText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
      marginTop: spacing(1),
    },
    maxedText: {
      color: colors.success,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
      marginTop: spacing(2),
    },
    legend: {
      marginTop: spacing(4),
      paddingTop: spacing(3),
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing(1),
    },
    legendText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
    },
    legendLabel: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
    },
  });
}
