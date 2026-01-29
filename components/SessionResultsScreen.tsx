/**
 * Session Results Screen Component
 *
 * Displays session rewards in a layered format:
 * 1. Hero moment (if any notable event)
 * 2. Rewards earned
 * 3. Progress made
 * 4. Next milestone
 * 5. Expandable details
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { SessionResultsData } from '@/lib/sessionResultsData';
import { HeroEvent } from '@/lib/heroEvents';
import { DungeonBar, PixelSprite } from '@/components/dungeon';

interface Props {
  data: SessionResultsData;
  bookTitle: string;
  onContinue: () => void;
}

export function SessionResultsScreen({ data, bookTitle, onContinue }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const styles = createStyles(colors, spacing, fontSize);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const topHeroEvent = data.heroEvents[0] ?? null;
  const hasBoost = data.totalBoostMultiplier > 1;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero Moment */}
        {topHeroEvent && (
          <View style={styles.heroSection}>
            <HeroMoment event={topHeroEvent} colors={colors} fontSize={fontSize} />
          </View>
        )}

        {/* Rewards Earned */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>rewards earned</Text>
          <View style={styles.rewardsRow}>
            {data.lootBoxBreakdown.total > 0 && (
              <View style={styles.rewardItem}>
                <PixelSprite tile="chest_wood_closed" scale={3} />
                <Text style={styles.rewardValue}>{data.lootBoxBreakdown.total}</Text>
                <Text style={styles.rewardLabel}>
                  loot box{data.lootBoxBreakdown.total !== 1 ? 'es' : ''}
                </Text>
                {data.lootBoxBreakdown.bonusDrop > 0 && (
                  <Text style={styles.bonusIndicator}>+bonus drop!</Text>
                )}
              </View>
            )}
            <View style={styles.rewardItem}>
              <Text style={styles.rewardValue}>+{data.xpGained}</Text>
              <Text style={styles.rewardLabel}>
                xp{hasBoost && ` (${data.totalBoostMultiplier.toFixed(2)}x)`}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Made */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>progress made</Text>

          {/* Book Level */}
          {data.bookLevel.current > data.bookLevel.previous ? (
            <Text style={styles.progressItem}>
              book level {data.bookLevel.previous} → {data.bookLevel.current}
            </Text>
          ) : (
            <Text style={styles.progressItemMuted}>
              book level {data.bookLevel.current} (no change)
            </Text>
          )}

          {/* Player Level */}
          {data.playerLevel.current > data.playerLevel.previous && (
            <Text style={styles.progressItem}>
              player level {data.playerLevel.previous} → {data.playerLevel.current}
            </Text>
          )}

          {/* Genre Levels */}
          {data.genreLevels.length > 0 && (
            <Text style={styles.progressItem}>
              {data.genreLevels
                .slice(0, 2)
                .map(g => `${g.genre} +${g.current - g.previous}`)
                .join(', ')}
              {data.genreLevels.length > 2 && `, +${data.genreLevels.length - 2} more`}
            </Text>
          )}

          {/* No progress message */}
          {data.bookLevel.current === data.bookLevel.previous &&
            data.genreLevels.length === 0 && (
              <Text style={styles.progressItemMuted}>
                keep reading to earn your next level!
              </Text>
            )}
        </View>

        {/* Next Milestone */}
        {data.nextMilestones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>next milestone</Text>
            {data.nextMilestones.slice(0, 2).map((milestone, index) => (
              <MilestoneRow key={index} milestone={milestone} colors={colors} fontSize={fontSize} />
            ))}
          </View>
        )}

        {/* Expandable Details */}
        <Pressable
          style={styles.detailsToggle}
          onPress={() => setDetailsExpanded(!detailsExpanded)}
        >
          <Text style={styles.detailsToggleText}>
            {detailsExpanded ? '▼ hide details' : '▶ see details'}
          </Text>
        </Pressable>

        {detailsExpanded && (
          <View style={styles.detailsSection}>
            {/* Effect Breakdown */}
            <Text style={styles.detailsHeading}>active boosts</Text>
            <Text style={styles.detailsText}>
              xp: {data.activeEffects.xpBoost > 0 ? `+${(data.activeEffects.xpBoost * 100).toFixed(0)}%` : 'none'}
            </Text>
            <Text style={styles.detailsText}>
              luck: {data.activeEffects.luck > 0 ? `+${(data.activeEffects.luck * 100).toFixed(0)}%` : 'none'}
            </Text>
            {data.streakMultiplier > 1 && (
              <Text style={styles.detailsText}>
                streak: {data.streakMultiplier}x
              </Text>
            )}

            {/* XP Calculation */}
            <Text style={styles.detailsHeading}>xp calculation</Text>
            <Text style={styles.detailsText}>
              {data.sessionMinutes} min × 10 xp/min = {data.sessionMinutes * 10} base xp
            </Text>
            {data.streakMultiplier > 1 && (
              <Text style={styles.detailsText}>
                × {data.streakMultiplier} streak bonus
              </Text>
            )}
            {data.activeEffects.xpBoost > 0 && (
              <Text style={styles.detailsText}>
                × {(1 + data.activeEffects.xpBoost).toFixed(2)} boost multiplier
              </Text>
            )}
            <Text style={styles.detailsText}>= {data.xpGained} xp earned</Text>

            {/* Loot Box Odds */}
            <Text style={styles.detailsHeading}>current loot box odds</Text>
            <Text style={styles.detailsText}>
              luck: {(data.lootBoxOdds.luck * 100).toFixed(0)}%
            </Text>
            <Text style={styles.detailsText}>
              pity counter: {data.lootBoxOdds.pityCounter} (gold guaranteed in {25 - data.lootBoxOdds.pityCounter})
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <Pressable style={styles.continueButton} onPress={onContinue}>
          <Text style={styles.continueButtonText}>[continue]</Text>
        </Pressable>
      </View>
    </View>
  );
}

function HeroMoment({
  event,
  colors,
  fontSize,
}: {
  event: HeroEvent;
  colors: ReturnType<typeof useTheme>['colors'];
  fontSize: ReturnType<typeof useTheme>['fontSize'];
}) {
  const heroText = getHeroText(event);

  return (
    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
      <Text
        style={{
          fontFamily: FONTS.mono,
          fontSize: fontSize('title'),
          color: colors.primary,
          textAlign: 'center',
        }}
      >
        {heroText}
      </Text>
    </View>
  );
}

function getHeroText(event: HeroEvent): string {
  switch (event.type) {
    case 'companion_unlocked':
      return `you discovered ${(event.data.companion as { name: string }).name}!`;
    case 'slot_unlocked':
      return `slot ${event.data.slot} unlocked!`;
    case 'bonus_drop':
      return 'lucky find!';
    case 'player_level_up':
      return `level ${event.data.newLevel}!`;
    case 'genre_threshold':
      return `${event.data.genre} level ${event.data.threshold}!`;
    case 'streak_threshold':
      return `${event.data.streak}-day streak! ${event.data.multiplier}x xp`;
    case 'book_level_up':
      return `book level ${event.data.newLevel}!`;
    case 'genre_level_up':
      return `${event.data.genre} level ${event.data.newLevel}!`;
    default:
      return '';
  }
}

function MilestoneRow({
  milestone,
  colors,
  fontSize,
}: {
  milestone: SessionResultsData['nextMilestones'][0];
  colors: ReturnType<typeof useTheme>['colors'];
  fontSize: ReturnType<typeof useTheme>['fontSize'];
}) {
  const progress = milestone.progress ?? 0;
  const progressPercent = Math.min(progress * 100, 100);

  let label = '';
  let remaining = '';

  switch (milestone.type) {
    case 'book_level':
      label = 'next loot box';
      remaining = `${milestone.remainingMinutes} min`;
      break;
    case 'companion_unlock':
      label = 'next companion';
      remaining = `${milestone.remainingMinutes} min`;
      break;
    case 'genre_rarity':
      label = `${milestone.data?.genre} rarity unlock`;
      remaining = `${milestone.data?.levelsNeeded} levels`;
      break;
  }

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontFamily: FONTS.mono, fontSize: fontSize('body'), color: colors.text }}>
          {label}
        </Text>
        <Text style={{ fontFamily: FONTS.mono, fontSize: fontSize('body'), color: colors.textSecondary }}>
          {remaining}
        </Text>
      </View>
      <DungeonBar
        value={progressPercent}
        max={100}
        color="amber"
        height={8}
      />
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize']
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing(4),
    },
    heroSection: {
      marginBottom: spacing(6),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: spacing(4),
    },
    section: {
      marginBottom: spacing(5),
    },
    sectionTitle: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing(2),
    },
    rewardsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    rewardItem: {
      alignItems: 'center',
    },
    rewardValue: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('title'),
      color: colors.text,
    },
    rewardLabel: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: colors.textSecondary,
    },
    bonusIndicator: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: colors.primary,
      marginTop: spacing(1),
    },
    progressItem: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: colors.text,
      marginBottom: spacing(1),
    },
    progressItemMuted: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    detailsToggle: {
      paddingVertical: spacing(3),
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    detailsToggleText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: colors.textSecondary,
    },
    detailsSection: {
      paddingTop: spacing(2),
    },
    detailsHeading: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: spacing(3),
      marginBottom: spacing(1),
    },
    detailsText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: colors.text,
      marginBottom: spacing(0.5),
    },
    footer: {
      padding: spacing(4),
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    continueButton: {
      padding: spacing(3),
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    continueButtonText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: colors.primary,
    },
  });
