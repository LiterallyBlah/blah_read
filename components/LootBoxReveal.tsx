import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import type { Companion, LootBoxTier } from '@/lib/types';
import type { ConsumableDefinition } from '@/lib/consumables';

interface Props {
  companion: Companion | null;
  consumable?: ConsumableDefinition | null;
  boxTier?: LootBoxTier | null;
  onDismiss: () => void;
  hasMoreBoxes: boolean;
  onOpenAnother: () => void;
}

// Tier display labels and colors
const TIER_LABELS: Record<LootBoxTier, string> = {
  wood: 'wood box',
  silver: 'silver box',
  gold: 'gold box',
};

// Consumable tier display colors
const CONSUMABLE_TIER_COLORS = {
  weak: 'rarityCommon',
  medium: 'rarityRare',
  strong: 'rarityLegendary',
} as const;

export function LootBoxReveal({ companion, consumable, boxTier, onDismiss, hasMoreBoxes, onOpenAnother }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const styles = createStyles(colors, spacing, fontSize);

  const rarityColors: Record<string, string> = {
    common: colors.rarityCommon,
    rare: colors.rarityRare,
    legendary: colors.rarityLegendary,
  };

  const tierColors: Record<LootBoxTier, string> = {
    wood: colors.rarityCommon,
    silver: colors.rarityRare,
    gold: colors.rarityLegendary,
  };

  // Handle consumable reveal
  if (consumable) {
    const consumableTierColor = colors[CONSUMABLE_TIER_COLORS[consumable.tier]];
    const boxColor = boxTier ? tierColors[boxTier] : colors.text;

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Box tier header */}
        {boxTier && (
          <Text style={[styles.boxTierHeader, { color: boxColor }]}>
            [{TIER_LABELS[boxTier]}]
          </Text>
        )}

        <View style={[styles.card, { borderColor: consumableTierColor }]}>
          {/* Consumable icon */}
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
            <Text style={[styles.consumableIcon, { color: consumableTierColor }]}>
              {consumable.tier === 'strong' ? '' : consumable.tier === 'medium' ? '' : ''}
            </Text>
          </View>

          <Text style={[styles.name, { color: colors.text }]}>
            {consumable.name.toLowerCase()}
          </Text>

          <Text style={[styles.rarity, { color: consumableTierColor }]}>
            [{consumable.tier}]
          </Text>

          <Text style={[styles.type, { color: colors.textSecondary }]}>
            consumable
          </Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {consumable.description}
          </Text>

          {consumable.duration > 0 && (
            <Text style={[styles.source, { color: colors.textMuted }]}>
              {consumable.duration} session{consumable.duration !== 1 ? 's' : ''}
            </Text>
          )}
          {consumable.duration === 0 && (
            <Text style={[styles.source, { color: colors.textMuted }]}>
              instant effect
            </Text>
          )}
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

  // Handle companion reveal (original behavior)
  if (!companion) {
    return null;
  }

  const rarityColor = rarityColors[companion.rarity] || colors.text;
  const boxColor = boxTier ? tierColors[boxTier] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Box tier header */}
      {boxTier && (
        <Text style={[styles.boxTierHeader, { color: boxColor }]}>
          [{TIER_LABELS[boxTier]}]
        </Text>
      )}

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
  boxTierHeader: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('body'),
    marginBottom: spacing(4),
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
  consumableIcon: {
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
