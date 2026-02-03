import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface ParticleBurstProps {
  active: boolean;
  color: string;
  particleCount?: number;
  size?: number;
  testID?: string;
}

interface ParticleProps {
  index: number;
  total: number;
  active: boolean;
  color: string;
  size: number;
}

function Particle({ index, total, active, color, size }: ParticleProps) {
  const progress = useSharedValue(0);

  // Calculate angle for this particle (evenly distributed)
  const angle = (index / total) * Math.PI * 2;
  const distance = size * 0.6;

  useEffect(() => {
    if (active) {
      // Stagger start times for organic feel
      const delay = index * 30;
      progress.value = withDelay(
        delay,
        withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) })
      );
    } else {
      progress.value = 0;
    }
  }, [active, index]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const x = Math.cos(angle) * distance * p;
    const y = Math.sin(angle) * distance * p - p * 20; // Rise up slightly
    const scale = 1 - p * 0.5;
    const opacity = 1 - p;

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale },
        { rotate: `${p * 180}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

export function ParticleBurst({
  active,
  color,
  particleCount = 10,
  size = 80,
  testID,
}: ParticleBurstProps) {
  return (
    <View testID={testID} style={[styles.container, { width: size, height: size }]}>
      {Array.from({ length: particleCount }).map((_, i) => (
        <Particle
          key={i}
          index={i}
          total={particleCount}
          active={active}
          color={color}
          size={size}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
