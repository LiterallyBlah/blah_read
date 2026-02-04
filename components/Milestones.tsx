import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, FONTS } from '@/lib/ui';
import { READING_TIME_MILESTONES, MILESTONE_RARITY_ODDS } from '@/lib/companionUnlock';

/**
 * Format seconds into a human-readable label
 */
function formatMilestoneLabel(seconds: number): string {
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = minutes / 60;
  if (hours === Math.floor(hours)) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${hours} hours`;
}

/**
 * Transform canonical milestone data into display format
 */
function buildMilestoneData() {
  return READING_TIME_MILESTONES.map((timeSeconds, index) => {
    const odds = MILESTONE_RARITY_ODDS[index];
    return {
      minutes: timeSeconds / 60,
      label: formatMilestoneLabel(timeSeconds),
      common: Math.round(odds.common * 100),
      rare: Math.round(odds.rare * 100),
      legendary: Math.round(odds.legendary * 100),
    };
  });
}

interface Props {
  currentReadingMinutes: number;
}

export function ReadingMilestones({ currentReadingMinutes }: Props) {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  // Build milestone data from canonical source (memoized since it's derived from constants)
  const milestones = useMemo(() => buildMilestoneData(), []);

  // Find the current milestone index (the highest milestone the user has reached)
  const currentMilestoneIndex = milestones.findIndex(
    (m, i) => {
      const nextMilestone = milestones[i + 1];
      return currentReadingMinutes >= m.minutes &&
             (!nextMilestone || currentReadingMinutes < nextMilestone.minutes);
    }
  );

  // If user hasn't reached any milestone, show first one as target
  const activeMilestoneIndex = currentMilestoneIndex === -1 ? 0 : currentMilestoneIndex;
  const activeMilestone = milestones[activeMilestoneIndex];

  // Check if user has maxed out milestones
  const isMaxed = currentReadingMinutes >= milestones[milestones.length - 1].minutes;

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
            {isMaxed ? 'max reached' : currentMilestoneIndex === -1 ? 'next' : 'current tier'}
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
          {milestones.map((milestone, index) => {
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
                  <Text style={styles.checkmark}>{isReached ? '[x]' : '[ ]'}</Text>
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
