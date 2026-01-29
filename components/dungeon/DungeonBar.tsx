// components/dungeon/DungeonBar.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';

interface DungeonBarProps {
  value: number;
  max: number;
  color?: 'amber' | 'green' | 'red';
  showText?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function DungeonBar({
  value,
  max,
  color = 'amber',
  showText = false,
  height = 8,
  style,
}: DungeonBarProps) {
  const { colors, fontSize } = useTheme();

  const fillColors: Record<string, string> = {
    amber: colors.accent || '#ffb347',
    green: colors.success,
    red: colors.error,
  };

  const fillColor = fillColors[color] || colors.accent;
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <View style={style}>
      <View
        style={[
          styles.container,
          {
            height,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
      {showText && (
        <Text
          style={[
            styles.text,
            {
              color: colors.textMuted,
              fontSize: fontSize('micro'),
            },
          ]}
        >
          {value} / {max}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  text: {
    fontFamily: FONTS.mono,
    marginTop: 2,
  },
});
