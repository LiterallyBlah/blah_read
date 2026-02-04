import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, FONTS } from '@/lib/ui';
import { PixelSprite } from '@/components/dungeon/PixelSprite';
import type { LootBoxTier } from '@/lib/shared';

interface LootBoxData {
  id: string;
  tier: LootBoxTier;
  source: 'level_up' | 'bonus_drop' | 'completion' | 'achievement' | 'reading_time';
}

interface Props {
  boxes: LootBoxData[];
  onContinue: () => void;
}

const CHEST_TILES = {
  wood: 'chest_wood_closed',
  silver: 'chest_silver_closed',
  gold: 'chest_gold_closed',
} as const;

export function LootBoxSummary({ boxes, onContinue }: Props) {
  const { colors, spacing, fontSize } = useTheme();

  const maxDisplay = 5;
  const displayBoxes = boxes.slice(0, maxDisplay);
  const overflow = boxes.length - maxDisplay;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>you earned loot!</Text>

      <View style={styles.boxesRow}>
        {displayBoxes.map((box) => (
          <View key={box.id} style={styles.boxItem}>
            <PixelSprite tile={CHEST_TILES[box.tier]} scale={3} />
          </View>
        ))}
        {overflow > 0 && (
          <View style={styles.overflowItem}>
            <Text style={[styles.overflowText, { color: colors.textSecondary }]}>+{overflow}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.subtext, { color: colors.textSecondary }]}>
        {boxes.length} box{boxes.length !== 1 ? 'es' : ''} added to inventory
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
  boxesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  boxItem: {
    alignItems: 'center',
  },
  overflowItem: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 48,
  },
  overflowText: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 18,
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
