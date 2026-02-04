import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { ConsumableIcon } from '@/components/dungeon/ConsumableIcon';
import { formatDuration, ConsumableEffectType, ConsumableTier } from '@/lib/consumables';

interface ConsumableData {
  id: string;
  name: string;
  tier: ConsumableTier;
  effectType: ConsumableEffectType;
  description: string;
  duration: number;
}

interface Props {
  consumables: ConsumableData[];
  onContinue: () => void;
}

const TIER_COLORS = {
  weak: 'rarityCommon',
  medium: 'rarityRare',
  strong: 'rarityLegendary',
} as const;

export function ConsumableSummary({ consumables, onContinue }: Props) {
  const { colors, spacing, fontSize } = useTheme();

  if (consumables.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>consumables found!</Text>

      <View style={styles.consumablesList}>
        {consumables.map((consumable) => {
          const tierColor = colors[TIER_COLORS[consumable.tier]];
          return (
            <View key={consumable.id} style={[styles.consumableItem, { borderColor: tierColor }]}>
              <View style={styles.iconContainer}>
                <ConsumableIcon effectType={consumable.effectType} tier={consumable.tier} />
              </View>
              <View style={styles.consumableInfo}>
                <Text style={[styles.consumableName, { color: colors.text }]}>
                  {consumable.name.toLowerCase()}
                </Text>
                <Text style={[styles.consumableTier, { color: tierColor }]}>
                  [{consumable.tier}]
                </Text>
                <Text style={[styles.consumableDesc, { color: colors.textSecondary }]}>
                  {consumable.description}
                </Text>
                <Text style={[styles.consumableDuration, { color: colors.textMuted }]}>
                  {consumable.duration === 0 ? 'instant effect' : formatDuration(consumable.duration)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={[styles.subtext, { color: colors.textSecondary }]}>
        {consumables.length} consumable{consumables.length !== 1 ? 's' : ''} activated
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
  consumablesList: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
    marginBottom: 24,
  },
  consumableItem: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  consumableInfo: {
    flex: 1,
  },
  consumableName: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 14,
  },
  consumableTier: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    marginTop: 2,
  },
  consumableDesc: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  consumableDuration: {
    fontFamily: FONTS.mono,
    fontSize: 10,
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
