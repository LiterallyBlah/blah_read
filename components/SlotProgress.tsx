import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, FONTS } from '@/lib/ui';
import {
  SlotUnlockProgress,
  calculateSlot2Progress,
  calculateSlot3Progress,
  SLOT_2_POINTS,
  SLOT_3_POINTS,
  SLOT_2_BOOK_FINISHED,
  SLOT_2_HOUR_LOGGED,
  SLOT_2_COMPANION_COLLECTED,
  SLOT_3_BOOK_FINISHED,
  SLOT_3_HOUR_LOGGED,
  SLOT_3_COMPANION_COLLECTED,
  SLOT_3_GENRE_LEVEL_TEN,
  SLOT_3_NEW_GENRE,
} from '@/lib/shared';
import { DungeonBar } from '@/components/dungeon';

interface Props {
  slotProgress: SlotUnlockProgress;
  unlockedSlots: 1 | 2 | 3;
}

export function SlotProgress({ slotProgress, unlockedSlots }: Props) {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  const slot2Points = calculateSlot2Progress(slotProgress);
  const slot3Points = calculateSlot3Progress(slotProgress);

  // Calculate individual point contributions for slot 2
  const slot2BookPoints = Math.min(slotProgress.booksFinished, 1) * SLOT_2_BOOK_FINISHED;
  const slot2HourPoints = slotProgress.hoursLogged * SLOT_2_HOUR_LOGGED;
  const slot2CompanionPoints = slotProgress.companionsCollected * SLOT_2_COMPANION_COLLECTED;

  // Calculate individual point contributions for slot 3
  const slot3BookPoints = slotProgress.booksFinished * SLOT_3_BOOK_FINISHED;
  const slot3HourPoints = slotProgress.hoursLogged * SLOT_3_HOUR_LOGGED;
  const slot3CompanionPoints = slotProgress.companionsCollected * SLOT_3_COMPANION_COLLECTED;
  const slot3GenreLevelPoints = slotProgress.genreLevelTens.length * SLOT_3_GENRE_LEVEL_TEN;
  const slot3GenreReadPoints = slotProgress.genresRead.length * SLOT_3_NEW_GENRE;

  // All slots unlocked
  if (unlockedSlots >= 3) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>slot progress_</Text>
        <Text style={styles.completedText}>all slots unlocked!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.sectionTitle}>slot progress_</Text>
        <Text style={styles.expandIcon}>{expanded ? '[-]' : '[+]'}</Text>
      </Pressable>

      {/* Slot 2 progress (if not unlocked) */}
      {unlockedSlots < 2 && (
        <View style={styles.slotSection}>
          <View style={styles.slotHeader}>
            <Text style={styles.slotLabel}>slot 2</Text>
            <Text style={styles.slotPoints}>{slot2Points} / {SLOT_2_POINTS} pts</Text>
          </View>
          <DungeonBar
            value={slot2Points}
            max={SLOT_2_POINTS}
            color="green"
            height={6}
          />

          {/* Detailed breakdown when expanded */}
          {expanded && (
            <View style={styles.breakdown}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>first book finished</Text>
                <Text style={styles.breakdownValue}>
                  {slot2BookPoints}/{SLOT_2_BOOK_FINISHED}
                  <Text style={styles.breakdownCount}>
                    {slotProgress.booksFinished >= 1 ? ' [x]' : ' [ ]'}
                  </Text>
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>hours logged</Text>
                <Text style={styles.breakdownValue}>
                  {slot2HourPoints}
                  <Text style={styles.breakdownCount}> ({slotProgress.hoursLogged} x {SLOT_2_HOUR_LOGGED})</Text>
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>companions</Text>
                <Text style={styles.breakdownValue}>
                  {slot2CompanionPoints}
                  <Text style={styles.breakdownCount}> ({slotProgress.companionsCollected} x {SLOT_2_COMPANION_COLLECTED})</Text>
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Slot 3 progress (if not unlocked) */}
      {unlockedSlots < 3 && (
        <View style={styles.slotSection}>
          <View style={styles.slotHeader}>
            <Text style={styles.slotLabel}>slot 3</Text>
            <Text style={styles.slotPoints}>{slot3Points} / {SLOT_3_POINTS} pts</Text>
          </View>
          <DungeonBar
            value={slot3Points}
            max={SLOT_3_POINTS}
            color="green"
            height={6}
          />

          {/* Detailed breakdown when expanded */}
          {expanded && (
            <View style={styles.breakdown}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>books finished</Text>
                <Text style={styles.breakdownValue}>
                  {slot3BookPoints}
                  <Text style={styles.breakdownCount}> ({slotProgress.booksFinished} x {SLOT_3_BOOK_FINISHED})</Text>
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>hours logged</Text>
                <Text style={styles.breakdownValue}>
                  {slot3HourPoints}
                  <Text style={styles.breakdownCount}> ({slotProgress.hoursLogged} x {SLOT_3_HOUR_LOGGED})</Text>
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>companions</Text>
                <Text style={styles.breakdownValue}>
                  {slot3CompanionPoints}
                  <Text style={styles.breakdownCount}> ({slotProgress.companionsCollected} x {SLOT_3_COMPANION_COLLECTED})</Text>
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>genre lvl 10s</Text>
                <Text style={styles.breakdownValue}>
                  {slot3GenreLevelPoints}
                  <Text style={styles.breakdownCount}> ({slotProgress.genreLevelTens.length} x {SLOT_3_GENRE_LEVEL_TEN})</Text>
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>genres read</Text>
                <Text style={styles.breakdownValue}>
                  {slot3GenreReadPoints}
                  <Text style={styles.breakdownCount}> ({slotProgress.genresRead.length} x {SLOT_3_NEW_GENRE})</Text>
                </Text>
              </View>
            </View>
          )}
        </View>
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
    completedText: {
      color: colors.success,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    slotSection: {
      marginBottom: spacing(4),
    },
    slotHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing(2),
    },
    slotLabel: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('small'),
    },
    slotPoints: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
    },
    breakdown: {
      marginTop: spacing(3),
      paddingLeft: spacing(2),
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing(1),
    },
    breakdownLabel: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
    },
    breakdownValue: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
    },
    breakdownCount: {
      color: colors.textMuted,
    },
  });
}
