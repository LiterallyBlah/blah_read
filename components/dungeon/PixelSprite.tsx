// components/dungeon/PixelSprite.tsx
import React from 'react';
import { Image, ImageStyle, StyleProp, View, ViewStyle } from 'react-native';
import { DUNGEON_TILES } from '@/lib/ui';

interface PixelSpriteProps {
  tile: keyof typeof DUNGEON_TILES;
  scale?: 2 | 3 | 4;
  tint?: string;
  style?: StyleProp<ImageStyle>;
}

const BASE_SIZE = 16;

export function PixelSprite({ tile, scale = 2, tint, style }: PixelSpriteProps) {
  const size = BASE_SIZE * scale;
  const source = DUNGEON_TILES[tile];

  const imageStyle: ImageStyle = {
    width: size,
    height: size,
  };

  if (tint) {
    return (
      <View style={[{ width: size, height: size }, style as StyleProp<ViewStyle>]}>
        <Image
          source={source}
          style={[imageStyle, { tintColor: tint }]}
          resizeMode="stretch"
        />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={[imageStyle, style]}
      resizeMode="stretch"
    />
  );
}
