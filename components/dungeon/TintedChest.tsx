import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { DUNGEON_TILES, CHEST_TILES, TIER_COLORS } from '@/lib/dungeonAssets';
import type { LootBoxTier } from '@/lib/shared';

interface TintedChestProps {
  tier: LootBoxTier;
  isOpen: boolean;
  glowIntensity?: number;
  scale?: number;
  testID?: string;
}

const BASE_SIZE = 16;

export function TintedChest({
  tier,
  isOpen,
  glowIntensity = 0,
  scale = 4,
  testID,
}: TintedChestProps) {
  const size = BASE_SIZE * scale;
  const tileKey = isOpen ? CHEST_TILES[tier].open : CHEST_TILES[tier].closed;
  const source = DUNGEON_TILES[tileKey];
  const tierConfig = TIER_COLORS[tier];

  return (
    <View testID={testID} style={[styles.container, { width: size, height: size }]}>
      {/* Glow layer underneath */}
      {glowIntensity > 0 && (
        <View
          style={[
            styles.glow,
            {
              backgroundColor: tierConfig.glow,
              opacity: glowIntensity * 0.5,
              width: size * 1.5,
              height: size * 1.5,
              borderRadius: size * 0.75,
            },
          ]}
        />
      )}

      {/* Base chest image */}
      <Image
        source={source}
        style={[styles.image, { width: size, height: size }]}
        resizeMode="stretch"
      />

      {/* Tint overlay for silver/gold - uses tintColor which respects transparency */}
      {tierConfig.tint && (
        <Image
          source={source}
          style={[
            styles.tintOverlay,
            {
              width: size,
              height: size,
              tintColor: tierConfig.tint,
              opacity: tierConfig.tintOpacity,
            },
          ]}
          resizeMode="stretch"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  image: {
    zIndex: 1,
  },
  tintOverlay: {
    position: 'absolute',
    zIndex: 2,
  },
});
