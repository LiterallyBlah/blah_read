// components/dungeon/DungeonCard.tsx
import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface DungeonCardProps {
  children: ReactNode;
  variant?: 'default' | 'common' | 'rare' | 'legendary';
  noPadding?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function DungeonCard({ children, variant = 'default', noPadding, style }: DungeonCardProps) {
  const { colors, spacing } = useTheme();

  const borderColors: Record<string, string> = {
    default: colors.border,
    common: colors.rarityCommon,
    rare: colors.rarityRare,
    legendary: colors.rarityLegendary,
  };

  const borderColor = borderColors[variant] || colors.border;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: (colors as any).card || colors.backgroundCard,
          borderColor,
          padding: noPadding ? 0 : spacing(4),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
  },
});
