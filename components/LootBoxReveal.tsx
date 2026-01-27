import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import type { Companion } from '@/lib/types';

interface Props {
  companion: Companion;
  onDismiss: () => void;
  hasMoreBoxes: boolean;
  onOpenAnother: () => void;
}

export function LootBoxReveal({ companion, onDismiss, hasMoreBoxes, onOpenAnother }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const styles = createStyles(colors, spacing, fontSize);

  const rarityColors: Record<string, string> = {
    common: colors.rarityCommon,
    rare: colors.rarityRare,
    legendary: colors.rarityLegendary,
  };

  const rarityColor = rarityColors[companion.rarity] || colors.text;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { borderColor: rarityColor }]}>
        {companion.imageUrl ? (
          <Image source={{ uri: companion.imageUrl }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
            <Text style={[styles.placeholderText, { color: colors.textMuted }]}>?</Text>
          </View>
        )}

        <Text style={[styles.name, { color: colors.text }]}>
          {companion.name.toLowerCase()}
        </Text>

        <Text style={[styles.rarity, { color: rarityColor }]}>
          [{companion.rarity}]
        </Text>

        <Text style={[styles.type, { color: colors.textSecondary }]}>
          {companion.type}
        </Text>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {companion.description}
        </Text>

        <Text style={[styles.source, { color: colors.textMuted }]}>
          {companion.source === 'discovered' ? 'discovered' : 'inspired'}
        </Text>
      </View>

      <View style={styles.buttons}>
        {hasMoreBoxes ? (
          <Pressable
            style={[styles.primaryButton, { borderColor: colors.text }]}
            onPress={onOpenAnother}
          >
            <Text style={[styles.primaryButtonText, { color: colors.text }]}>
              [ open another ]
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={onDismiss}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
            [done]
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize']
) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(6),
  },
  card: {
    padding: spacing(6),
    borderWidth: 2,
    alignItems: 'center',
    maxWidth: 300,
  },
  image: {
    width: 128,
    height: 128,
  },
  imagePlaceholder: {
    width: 128,
    height: 128,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontFamily: FONTS.mono,
    fontSize: 48,
  },
  name: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    marginTop: spacing(4),
    textAlign: 'center',
  },
  rarity: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('body'),
    marginTop: spacing(2),
  },
  type: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    marginTop: spacing(1),
  },
  description: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    textAlign: 'center',
    marginTop: spacing(4),
    lineHeight: 20,
  },
  source: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    marginTop: spacing(3),
  },
  buttons: {
    marginTop: spacing(8),
    gap: spacing(3),
  },
  primaryButton: {
    borderWidth: 1,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(6),
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('body'),
  },
  secondaryButton: {
    borderWidth: 1,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(6),
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
  },
});
