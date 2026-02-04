import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { CompanionEffect, EffectType } from '@/lib/companionEffects';
import { GENRE_DISPLAY_NAMES, Genre } from '@/lib/shared';

// Display names for effect types
const EFFECT_DISPLAY_NAMES: Record<EffectType, string> = {
  xp_boost: 'XP',
  luck: 'Luck',
  rare_luck: 'Rare Luck',
  legendary_luck: 'Gold Luck',
  drop_rate_boost: 'Drop Rate',
  completion_bonus: 'Completion',
};

interface EffectBadgeProps {
  effect: CompanionEffect;
  bookGenres?: Genre[];
  compact?: boolean; // Smaller display for card views
}

/**
 * Displays a companion effect with visual indication of whether it applies
 * to the current book's genres.
 *
 * - Global effects (no targetGenre): Always shown as active
 * - Genre-targeted effects: Active if book has matching genre, inactive otherwise
 */
export function EffectBadge({ effect, bookGenres = [], compact = false }: EffectBadgeProps) {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();

  // Determine if effect applies to current book
  const isGlobal = effect.targetGenre === undefined;
  const genreMatches = isGlobal || bookGenres.includes(effect.targetGenre!);

  // Format magnitude as percentage
  const magnitudePercent = Math.round(effect.magnitude * 100);

  // Build display text
  const effectName = EFFECT_DISPLAY_NAMES[effect.type] || effect.type;
  const genreLabel = effect.targetGenre
    ? GENRE_DISPLAY_NAMES[effect.targetGenre].toLowerCase()
    : null;

  const styles = createStyles(colors, spacing, fontSize, letterSpacing, compact);

  return (
    <View style={[
      styles.container,
      !genreMatches && styles.containerInactive,
    ]}>
      <View style={styles.row}>
        <Text style={[
          styles.indicator,
          genreMatches ? styles.indicatorActive : styles.indicatorInactive,
        ]}>
          {genreMatches ? '[+]' : '[-]'}
        </Text>

        <Text style={[
          styles.magnitude,
          !genreMatches && styles.textInactive,
        ]}>
          +{magnitudePercent}%
        </Text>

        <Text style={[
          styles.effectName,
          !genreMatches && styles.textInactive,
        ]}>
          {effectName}
        </Text>

        {genreLabel && (
          <Text style={[
            styles.genreLabel,
            genreMatches ? styles.genreLabelActive : styles.genreLabelInactive,
          ]}>
            ({genreLabel})
          </Text>
        )}
      </View>
    </View>
  );
}

type FontSize = 'micro' | 'small' | 'body' | 'large' | 'title' | 'hero';
type LetterSpacingSize = 'tight' | 'normal' | 'wide' | 'hero';

function createStyles(
  colors: any,
  spacing: (n: number) => number,
  fontSize: (size: FontSize) => number,
  letterSpacing: (size: LetterSpacingSize) => number,
  compact: boolean
) {
  const textSize = compact ? fontSize('micro') : fontSize('small');

  return StyleSheet.create({
    container: {
      paddingVertical: spacing(compact ? 0.5 : 1),
    },
    containerInactive: {
      opacity: 0.6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(1),
    },
    indicator: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      width: compact ? 16 : 20,
    },
    indicatorActive: {
      color: colors.success,
    },
    indicatorInactive: {
      color: colors.error,
    },
    magnitude: {
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: textSize,
      color: colors.text,
      minWidth: compact ? 32 : 40,
    },
    effectName: {
      fontFamily: FONTS.mono,
      fontSize: textSize,
      letterSpacing: letterSpacing('tight'),
      color: colors.textSecondary,
    },
    textInactive: {
      color: colors.textMuted,
    },
    genreLabel: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
    },
    genreLabelActive: {
      color: colors.success,
    },
    genreLabelInactive: {
      color: colors.error,
    },
  });
}

/**
 * Display a list of effect badges for a companion's effects.
 */
interface EffectBadgeListProps {
  effects: CompanionEffect[];
  bookGenres?: Genre[];
  compact?: boolean;
}

export function EffectBadgeList({ effects, bookGenres = [], compact = false }: EffectBadgeListProps) {
  const { colors, spacing } = useTheme();

  if (!effects || effects.length === 0) {
    return (
      <Text style={{
        fontFamily: FONTS.mono,
        fontSize: 10,
        color: colors.textMuted,
      }}>
        no effects
      </Text>
    );
  }

  return (
    <View style={{ gap: spacing(compact ? 0.5 : 1) }}>
      {effects.map((effect, index) => (
        <EffectBadge
          key={`${effect.type}-${effect.targetGenre || 'global'}-${index}`}
          effect={effect}
          bookGenres={bookGenres}
          compact={compact}
        />
      ))}
    </View>
  );
}
