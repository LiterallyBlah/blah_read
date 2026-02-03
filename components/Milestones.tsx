import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';

const READING_MILESTONES = [
  { minutes: 30, label: '30 min', common: 80, rare: 18, legendary: 2 },
  { minutes: 60, label: '1 hour', common: 70, rare: 27, legendary: 3 },
  { minutes: 120, label: '2 hours', common: 60, rare: 35, legendary: 5 },
  { minutes: 240, label: '4 hours', common: 50, rare: 42, legendary: 8 },
  { minutes: 360, label: '6 hours', common: 40, rare: 48, legendary: 12 },
  { minutes: 480, label: '8 hours', common: 30, rare: 52, legendary: 18 },
  { minutes: 600, label: '10 hours', common: 20, rare: 55, legendary: 25 },
];

interface Props {
  currentReadingMinutes: number;
}

export function ReadingMilestones({ currentReadingMinutes }: Props) {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  // Find the current milestone index (the highest milestone the user has reached)
  const currentMilestoneIndex = READING_MILESTONES.findIndex(
    (m, i) => {
      const nextMilestone = READING_MILESTONES[i + 1];
      return currentReadingMinutes >= m.minutes &&
             (!nextMilestone || currentReadingMinutes < nextMilestone.minutes);
    }
  );

  // If user hasn't reached any milestone, show first one as target
  const activeMilestoneIndex = currentMilestoneIndex === -1 ? 0 : currentMilestoneIndex;
  const activeMilestone = READING_MILESTONES[activeMilestoneIndex];

  // Check if user has maxed out milestones
  const isMaxed = currentReadingMinutes >= READING_MILESTONES[READING_MILESTONES.length - 1].minutes;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.sectionTitle}>milestones_</Text>
        <Text style={styles.expandIcon}>{expanded ? '[-]' : '[+]'}</Text>
      </Pressable>

      {/* Current/Active milestone always visible */}
      <View style={styles.activeMilestone}>
        <View style={styles.milestoneHeader}>
          <Text style={styles.milestoneLabel}>
            {isMaxed ? 'max reached' : currentMilestoneIndex === -1 ? 'next' : 'current'}
          </Text>
          <Text style={styles.milestoneName}>{activeMilestone.label}</Text>
        </View>
        <View style={styles.oddsRow}>
          <View style={styles.oddItem}>
            <Text style={[styles.oddValue, { color: colors.rarityCommon }]}>
              {activeMilestone.common}%
            </Text>
            <Text style={styles.oddLabel}>common</Text>
          </View>
          <View style={styles.oddItem}>
            <Text style={[styles.oddValue, { color: colors.rarityRare }]}>
              {activeMilestone.rare}%
            </Text>
            <Text style={styles.oddLabel}>rare</Text>
          </View>
          <View style={styles.oddItem}>
            <Text style={[styles.oddValue, { color: colors.rarityLegendary }]}>
              {activeMilestone.legendary}%
            </Text>
            <Text style={styles.oddLabel}>legendary</Text>
          </View>
        </View>
      </View>

      {/* Expanded view shows all milestones */}
      {expanded && (
        <View style={styles.allMilestones}>
          {READING_MILESTONES.map((milestone, index) => {
            const isReached = currentReadingMinutes >= milestone.minutes;
            const isCurrent = index === activeMilestoneIndex;

            return (
              <View
                key={milestone.minutes}
                style={[
                  styles.milestoneRow,
                  isCurrent && styles.milestoneRowCurrent,
                  !isReached && styles.milestoneRowLocked,
                ]}
              >
                <View style={styles.milestoneRowHeader}>
                  <Text style={[
                    styles.milestoneRowLabel,
                    !isReached && styles.textLocked,
                  ]}>
                    {milestone.label}
                  </Text>
                  {isReached && <Text style={styles.checkmark}>[ok]</Text>}
                </View>
                <View style={styles.milestoneRowOdds}>
                  <Text style={[
                    styles.milestoneOdd,
                    { color: isReached ? colors.rarityCommon : colors.textMuted },
                  ]}>
                    {milestone.common}%
                  </Text>
                  <Text style={[
                    styles.milestoneOdd,
                    { color: isReached ? colors.rarityRare : colors.textMuted },
                  ]}>
                    {milestone.rare}%
                  </Text>
                  <Text style={[
                    styles.milestoneOdd,
                    { color: isReached ? colors.rarityLegendary : colors.textMuted },
                  ]}>
                    {milestone.legendary}%
                  </Text>
                </View>
              </View>
            );
          })}
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
    activeMilestone: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing(3),
    },
    milestoneHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing(2),
    },
    milestoneLabel: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
    },
    milestoneName: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('body'),
    },
    oddsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    oddItem: {
      alignItems: 'center',
      flex: 1,
    },
    oddValue: {
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('large'),
    },
    oddLabel: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
    },
    allMilestones: {
      marginTop: spacing(2),
      gap: spacing(1),
    },
    milestoneRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing(2),
      paddingHorizontal: spacing(3),
      borderWidth: 1,
      borderColor: colors.border,
    },
    milestoneRowCurrent: {
      borderColor: colors.success,
    },
    milestoneRowLocked: {
      opacity: 0.5,
    },
    milestoneRowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(2),
    },
    milestoneRowLabel: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      minWidth: 64,
    },
    textLocked: {
      color: colors.textMuted,
    },
    checkmark: {
      color: colors.success,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
    },
    milestoneRowOdds: {
      flexDirection: 'row',
      gap: spacing(4),
    },
    milestoneOdd: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      minWidth: 32,
      textAlign: 'right',
    },
  });
}
