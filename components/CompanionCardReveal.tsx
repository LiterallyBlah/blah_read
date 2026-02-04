import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Animated } from 'react-native';
import { useTheme, FONTS } from '@/lib/ui';

interface CompanionData {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'legendary';
  type: 'character' | 'creature' | 'object';
  description: string;
  imageUrl: string | null;
}

interface Props {
  companion: CompanionData;
  onComplete: () => void;
  isLast: boolean;
}

export function CompanionCardReveal({ companion, onComplete, isLast }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const rarityColors: Record<string, string> = {
    common: colors.rarityCommon,
    rare: colors.rarityRare,
    legendary: colors.rarityLegendary,
  };

  const handleTap = () => {
    if (revealed) return;

    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setRevealed(true);
    });
  };

  // Front of card (face-down) - visible when flipAnim is 0
  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '90deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  // Back of card (revealed) - visible when flipAnim is 1
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-90deg', '-90deg', '0deg'],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const rarityColor = rarityColors[companion.rarity] || colors.text;

  // Pulse animation for legendary
  const pulseAnim = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (companion.rarity === 'legendary' && !revealed) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      animation.start();
    }
    return () => {
      animation?.stop();
    };
  }, [companion.rarity, revealed]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable onPress={handleTap} style={styles.cardWrapper}>
        {/* Face-down card */}
        <Animated.View
          style={[
            styles.card,
            {
              borderColor: rarityColor,
              backgroundColor: colors.surface,
              transform: [{ rotateY: frontRotate }, { scale: companion.rarity === 'legendary' ? pulseAnim : 1 }],
              opacity: frontOpacity,
            },
          ]}
        >
          <Text style={[styles.questionMark, { color: rarityColor }]}>?</Text>
          <Text style={[styles.tapText, { color: colors.textMuted }]}>tap to reveal</Text>
        </Animated.View>

        {/* Revealed card */}
        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            {
              borderColor: rarityColor,
              backgroundColor: colors.surface,
              transform: [{ rotateY: backRotate }],
              opacity: backOpacity,
            },
          ]}
        >
          {companion.imageUrl ? (
            <Image source={{ uri: companion.imageUrl }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.background }]}>
              <Text style={[styles.placeholderText, { color: colors.textMuted }]}>?</Text>
            </View>
          )}

          <Text style={[styles.name, { color: colors.text }]}>{companion.name.toLowerCase()}</Text>
          <Text style={[styles.rarity, { color: rarityColor }]}>[{companion.rarity}]</Text>
          <Text style={[styles.type, { color: colors.textSecondary }]}>{companion.type}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{companion.description}</Text>
        </Animated.View>
      </Pressable>

      {revealed && (
        <Pressable style={[styles.button, { borderColor: colors.text }]} onPress={onComplete}>
          <Text style={[styles.buttonText, { color: colors.text }]}>
            [{isLast ? 'continue' : 'next'}]
          </Text>
        </Pressable>
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
  cardWrapper: {
    width: 280,
    height: 400,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    position: 'absolute',
  },
  questionMark: {
    fontFamily: FONTS.mono,
    fontSize: 120,
    fontWeight: FONTS.monoBold,
  },
  tapText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    marginTop: 24,
  },
  image: {
    width: 120,
    height: 120,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
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
    fontSize: 20,
    marginTop: 16,
    textAlign: 'center',
  },
  rarity: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 14,
    marginTop: 8,
  },
  type: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    marginTop: 4,
  },
  description: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    marginTop: 32,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 16,
  },
});
