// components/dungeon/ChestReveal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { PixelSprite } from './PixelSprite';
import { ConsumableIcon } from './ConsumableIcon';
import { CHEST_TILES } from '@/lib/dungeonAssets';
import type { LootBoxTier, Companion } from '@/lib/types';
import type { ConsumableDefinition } from '@/lib/consumables';

type RevealStage = 'closed' | 'shaking' | 'open' | 'category' | 'item';

interface ChestRevealProps {
  tier: LootBoxTier;
  category: 'companion' | 'consumable';
  companion?: Companion | null;
  consumable?: ConsumableDefinition | null;
  onComplete: () => void;
  hasMoreBoxes: boolean;
  onOpenAnother: () => void;
}

const TIER_LABELS: Record<LootBoxTier, string> = {
  wood: 'wood box',
  silver: 'silver box',
  gold: 'gold box',
};

export function ChestReveal({
  tier,
  category,
  companion,
  consumable,
  onComplete,
  hasMoreBoxes,
  onOpenAnother,
}: ChestRevealProps) {
  const { colors, spacing, fontSize } = useTheme();
  const [stage, setStage] = useState<RevealStage>('closed');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const tierColors: Record<LootBoxTier, string> = {
    wood: colors.rarityCommon,
    silver: colors.rarityRare,
    gold: colors.rarityLegendary,
  };

  // Handle stage transitions
  useEffect(() => {
    if (stage === 'shaking') {
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start(() => {
        setStage('open');
      });
    } else if (stage === 'open') {
      // Fade in tier label
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      // Move to category after delay
      setTimeout(() => setStage('category'), 800);
    } else if (stage === 'category') {
      // Move to item after delay
      setTimeout(() => setStage('item'), 600);
    }
  }, [stage]);

  const handleTap = () => {
    if (stage === 'closed') {
      setStage('shaking');
    }
  };

  const shakeTransform = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  // Get chest tile key
  const chestTileKey = stage === 'closed' || stage === 'shaking'
    ? CHEST_TILES[tier].closed
    : CHEST_TILES[tier].open;

  // Gold tint for gold chests
  const chestTint = tier === 'gold' && (stage === 'closed' || stage === 'shaking')
    ? colors.rarityLegendary
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Chest area */}
      <Pressable onPress={handleTap} style={styles.chestArea}>
        <Animated.View style={{ transform: [{ rotate: shakeTransform }] }}>
          <PixelSprite tile={chestTileKey} scale={4} tint={chestTint} />
        </Animated.View>

        {stage === 'closed' && (
          <Text style={[styles.tapText, { color: colors.textMuted }]}>
            tap to open
          </Text>
        )}

        {/* Tier label (shows after open) */}
        {(stage === 'open' || stage === 'category' || stage === 'item') && (
          <Animated.Text
            style={[
              styles.tierLabel,
              { color: tierColors[tier], opacity: fadeAnim },
            ]}
          >
            [{TIER_LABELS[tier]}]
          </Animated.Text>
        )}
      </Pressable>

      {/* Category hint */}
      {stage === 'category' && (
        <View style={styles.categoryHint}>
          <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
            you found a {category}...
          </Text>
        </View>
      )}

      {/* Item reveal */}
      {stage === 'item' && (
        <View style={styles.itemReveal}>
          {category === 'consumable' && consumable && (
            <View style={styles.itemCard}>
              <ConsumableIcon
                effectType={consumable.effectType}
                tier={consumable.tier}
              />
              <Text style={[styles.itemName, { color: colors.text }]}>
                {consumable.name.toLowerCase()}
              </Text>
              <Text style={[styles.itemRarity, { color: tierColors[tier] }]}>
                [{consumable.tier}]
              </Text>
              <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
                {consumable.description}
              </Text>
            </View>
          )}

          {category === 'companion' && companion && (
            <View style={styles.itemCard}>
              {companion.imageUrl ? (
                <View style={styles.companionImage}>
                  {/* Companion image handled by parent */}
                </View>
              ) : (
                <PixelSprite tile="character_knight" scale={4} />
              )}
              <Text style={[styles.itemName, { color: colors.text }]}>
                {companion.name.toLowerCase()}
              </Text>
              <Text style={[styles.itemRarity, { color: tierColors[tier] }]}>
                [{companion.rarity}]
              </Text>
              <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
                {companion.description}
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttons}>
            {hasMoreBoxes && (
              <Pressable
                style={[styles.primaryButton, { borderColor: colors.text }]}
                onPress={onOpenAnother}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  [ open another ]
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={onComplete}
            >
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                [ done ]
              </Text>
            </Pressable>
          </View>
        </View>
      )}
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
  chestArea: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tapText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    marginTop: 16,
  },
  tierLabel: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 16,
    marginTop: 16,
  },
  categoryHint: {
    marginTop: 16,
  },
  categoryText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
  },
  itemReveal: {
    alignItems: 'center',
    marginTop: 24,
  },
  itemCard: {
    alignItems: 'center',
    padding: 16,
    minWidth: 200,
  },
  companionImage: {
    width: 64,
    height: 64,
    marginBottom: 8,
  },
  itemName: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  itemRarity: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 14,
    marginTop: 4,
  },
  itemDesc: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 250,
  },
  buttons: {
    marginTop: 32,
    gap: 12,
  },
  primaryButton: {
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 14,
  },
});
