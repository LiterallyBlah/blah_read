import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, FONTS } from '@/lib/ui';
import type { AchievedMilestone } from '@/lib/rewards';

interface Props {
  milestones: AchievedMilestone[];
  onContinue: () => void;
}

// Icons for different milestone types
const MILESTONE_ICONS: Record<string, string> = {
  streak: '*',
  xp: '+',
  book_finished: '#',
  books_added: '@',
  hours_read: '~',
};

export function MilestonesSummary({ milestones, onContinue }: Props) {
  const { colors, spacing, fontSize } = useTheme();

  if (milestones.length === 0) {
    return null;
  }

  // Calculate total boxes awarded
  const totalBoxes = milestones.reduce((sum, m) => sum + m.boxesAwarded, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>milestones reached!</Text>

      <View style={styles.milestonesList}>
        {milestones.map((milestone, index) => {
          const icon = MILESTONE_ICONS[milestone.type] || '>';
          return (
            <View key={`${milestone.type}-${milestone.milestone}-${index}`} style={styles.milestoneItem}>
              <Text style={[styles.milestoneIcon, { color: colors.rarityLegendary }]}>
                {icon}
              </Text>
              <View style={styles.milestoneInfo}>
                <Text style={[styles.milestoneDesc, { color: colors.text }]}>
                  {milestone.description}
                </Text>
                <Text style={[styles.milestoneReward, { color: colors.textSecondary }]}>
                  +{milestone.boxesAwarded} loot box{milestone.boxesAwarded !== 1 ? 'es' : ''}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={[styles.subtext, { color: colors.textSecondary }]}>
        {totalBoxes} box{totalBoxes !== 1 ? 'es' : ''} earned from achievements
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
  milestonesList: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
    marginBottom: 24,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  milestoneIcon: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneDesc: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 14,
  },
  milestoneReward: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    marginTop: 4,
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
