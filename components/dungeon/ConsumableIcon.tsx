// components/dungeon/ConsumableIcon.tsx
import React from 'react';
import { View, Image, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getConsumableTileForTier, getTierPixelSize } from '@/lib/dungeonAssets';
import type { ConsumableEffectType, ConsumableTier } from '@/lib/consumables';

interface ConsumableIconProps {
  effectType: ConsumableEffectType;
  tier: ConsumableTier;
  /** Override the tier-based size with a fixed size (in pixels) */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function ConsumableIcon({ effectType, tier, size: fixedSize, style }: ConsumableIconProps) {
  const { colors } = useTheme();

  // Get the pre-scaled tile for this tier
  const source = getConsumableTileForTier(effectType, tier);
  // Use fixed size if provided, otherwise use tier-based size
  const size = fixedSize ?? getTierPixelSize(tier);

  // Border color based on tier
  const borderColors: Record<ConsumableTier, string> = {
    weak: colors.rarityCommon,
    medium: colors.rarityRare,
    strong: colors.rarityLegendary,
  };

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
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
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
