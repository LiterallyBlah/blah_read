// components/dungeon/ConsumableIcon.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { PixelSprite } from './PixelSprite';
import { CONSUMABLE_TILES } from '@/lib/dungeonAssets';
import type { ConsumableEffectType, ConsumableTier } from '@/lib/consumables';

interface ConsumableIconProps {
  effectType: ConsumableEffectType;
  tier: ConsumableTier;
  style?: StyleProp<ViewStyle>;
}

export function ConsumableIcon({ effectType, tier, style }: ConsumableIconProps) {
  const { colors } = useTheme();

  // Scale based on tier
  const scale: 2 | 3 | 4 = tier === 'strong' ? 4 : tier === 'medium' ? 3 : 2;

  // Border color based on tier
  const borderColors: Record<ConsumableTier, string> = {
    weak: colors.rarityCommon,
    medium: colors.rarityRare,
    strong: colors.rarityLegendary,
  };

  const tileKey = CONSUMABLE_TILES[effectType];

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: borderColors[tier],
          borderWidth: tier === 'strong' ? 2 : 1,
        },
        style,
      ]}
    >
      <PixelSprite tile={tileKey} scale={scale} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
