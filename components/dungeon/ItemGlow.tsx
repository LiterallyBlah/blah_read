import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import type { CompanionRarity } from '@/lib/shared';

interface ItemGlowProps {
  rarity: CompanionRarity;
  intensity: number;
  size?: number;
  testID?: string;
}

// Glow configuration per rarity
const RARITY_GLOW: Record<CompanionRarity, { color: string; baseSize: number; baseOpacity: number }> = {
  common: {
    color: '#A0A0A0',
    baseSize: 40,
    baseOpacity: 0.3,
  },
  rare: {
    color: '#4A90D9',
    baseSize: 60,
    baseOpacity: 0.5,
  },
  legendary: {
    color: '#FFD700',
    baseSize: 80,
    baseOpacity: 0.7,
  },
};

export function ItemGlow({ rarity, intensity, size, testID }: ItemGlowProps) {
  const config = RARITY_GLOW[rarity];
  const glowSize = size ?? config.baseSize;
  const opacity = config.baseOpacity * intensity;

  if (intensity <= 0) {
    return null;
  }

  return (
    <View testID={testID} style={[styles.container, { width: glowSize, height: glowSize }]}>
      <Svg width={glowSize} height={glowSize} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={config.color} stopOpacity={opacity} />
            <Stop offset="100%" stopColor={config.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={glowSize} height={glowSize} fill="url(#glow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
