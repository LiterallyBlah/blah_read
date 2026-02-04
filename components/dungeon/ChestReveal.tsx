import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { TintedChest } from './TintedChest';
import { ParticleBurst } from './ParticleBurst';
import { ItemGlow } from './ItemGlow';
import { ConsumableIcon } from './ConsumableIcon';
import { useRevealTimeline, TIMELINE } from '@/hooks/useRevealTimeline';
import { getTierGlowColor } from '@/lib/dungeonAssets';
import type { LootBoxTier, Companion, CompanionRarity } from '@/lib/shared';
import type { ConsumableDefinition } from '@/lib/consumables';

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
  const { colors } = useTheme();
  const { state, progress, start, reset } = useRevealTimeline();

  const tierColor = {
    wood: colors.rarityCommon,
    silver: colors.rarityRare,
    gold: colors.rarityLegendary,
  }[tier];

  const itemRarity: CompanionRarity = companion?.rarity ??
    (consumable?.tier === 'strong' ? 'legendary' :
     consumable?.tier === 'medium' ? 'rare' : 'common');

  const handleTap = () => {
    if (state === 'idle') {
      start();
    }
  };

  const handleOpenAnother = () => {
    reset();
    onOpenAnother();
  };

  // Animated styles derived from progress
  const shakeStyle = useAnimatedStyle(() => {
    const shakeProgress = interpolate(
      progress.value,
      [0, 0.1, 0.2, 0.3, 0.33],
      [0, 1, -1, 1, 0],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ rotate: `${shakeProgress * 3}deg` }],
    };
  });

  const itemRiseStyle = useAnimatedStyle(() => {
    const riseStart = TIMELINE.ITEM_RISE_START / TIMELINE.TOTAL_DURATION;
    const riseEnd = TIMELINE.ITEM_RISE_END / TIMELINE.TOTAL_DURATION;

    const translateY = interpolate(
      progress.value,
      [riseStart, riseEnd],
      [40, 0],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      progress.value,
      [riseStart, riseStart + 0.05],
      [0, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      progress.value,
      [riseStart, riseEnd * 0.9, riseEnd],
      [0.8, 1.05, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  const itemGlowStyle = useAnimatedStyle(() => {
    const glowStart = TIMELINE.GLOW_START / TIMELINE.TOTAL_DURATION;
    const opacity = interpolate(
      progress.value,
      [glowStart, glowStart + 0.1],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const nameFadeStyle = useAnimatedStyle(() => {
    const fadeStart = TIMELINE.NAME_FADE_IN / TIMELINE.TOTAL_DURATION;
    const opacity = interpolate(
      progress.value,
      [fadeStart, fadeStart + 0.08],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const detailsFadeStyle = useAnimatedStyle(() => {
    const fadeStart = TIMELINE.DETAILS_FADE_IN / TIMELINE.TOTAL_DURATION;
    const opacity = interpolate(
      progress.value,
      [fadeStart, fadeStart + 0.08],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const buttonsFadeStyle = useAnimatedStyle(() => {
    const fadeStart = TIMELINE.BUTTONS_FADE_IN / TIMELINE.TOTAL_DURATION;
    const opacity = interpolate(
      progress.value,
      [fadeStart, fadeStart + 0.08],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const isOpen = state === 'revealing' || state === 'complete';
  const showParticles = state === 'revealing' || state === 'complete';
  const showItem = state === 'revealing' || state === 'complete';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Chest area */}
      <Pressable onPress={handleTap} style={styles.chestArea}>
        <Animated.View style={shakeStyle}>
          <TintedChest
            tier={tier}
            isOpen={isOpen}
            glowIntensity={state === 'shaking' ? 0.8 : state === 'idle' ? 0.3 : 0}
            scale={4}
          />
        </Animated.View>

        {/* Particle burst */}
        <ParticleBurst
          active={showParticles}
          color={getTierGlowColor(tier)}
          particleCount={10}
          size={120}
        />

        {state === 'idle' && (
          <Text style={[styles.tapText, { color: colors.textMuted }]}>
            tap to open
          </Text>
        )}
      </Pressable>

      {/* Item reveal */}
      {showItem && (
        <View style={styles.itemReveal}>
          {/* Item with glow */}
          <Animated.View style={[styles.itemContainer, itemRiseStyle]}>
            <Animated.View style={[styles.glowContainer, itemGlowStyle]}>
              <ItemGlow rarity={itemRarity} intensity={1} />
            </Animated.View>

            {category === 'consumable' && consumable && (
              <ConsumableIcon effectType={consumable.effectType} tier={consumable.tier} />
            )}

            {category === 'companion' && companion?.imageUrl && (
              <Image
                source={{ uri: companion.imageUrl }}
                style={styles.companionImage}
                resizeMode="contain"
              />
            )}
          </Animated.View>

          {/* Item details */}
          <Animated.View style={nameFadeStyle}>
            <Text style={[styles.tierLabel, { color: tierColor }]}>
              [{TIER_LABELS[tier]}]
            </Text>
            <Text style={[styles.itemName, { color: colors.text }]}>
              {consumable?.name.toLowerCase() ?? companion?.name.toLowerCase()}
            </Text>
          </Animated.View>

          <Animated.View style={detailsFadeStyle}>
            <Text style={[styles.itemRarity, { color: tierColor }]}>
              [{consumable?.tier ?? companion?.rarity}]
            </Text>
            <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
              {consumable?.description ?? companion?.description}
            </Text>
          </Animated.View>

          {/* Action buttons */}
          <Animated.View style={[styles.buttons, buttonsFadeStyle]}>
            {hasMoreBoxes && (
              <Pressable
                style={[styles.primaryButton, { borderColor: colors.text }]}
                onPress={handleOpenAnother}
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
          </Animated.View>
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
  itemReveal: {
    alignItems: 'center',
    marginTop: 16,
  },
  itemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  tierLabel: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  itemName: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 18,
    textAlign: 'center',
  },
  itemRarity: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  itemDesc: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 250,
    lineHeight: 18,
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
