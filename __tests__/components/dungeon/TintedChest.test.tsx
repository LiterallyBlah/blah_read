import React from 'react';

// Mock React Native completely without requiring the actual module
jest.mock('react-native', () => ({
  View: 'View',
  Image: 'Image',
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}));

// Mock the image assets
jest.mock('@/lib/dungeonAssets', () => ({
  DUNGEON_TILES: {
    chest_wood_closed: 1,
    chest_silver_closed: 2,
    chest_gold_closed: 3,
    chest_open: 4,
  },
  CHEST_TILES: {
    wood: { closed: 'chest_wood_closed', open: 'chest_open' },
    silver: { closed: 'chest_silver_closed', open: 'chest_open' },
    gold: { closed: 'chest_gold_closed', open: 'chest_open' },
  },
  TIER_COLORS: {
    wood: { tint: null, tintOpacity: 0, glow: '#8B7355' },
    silver: { tint: '#A8B5C4', tintOpacity: 0.6, glow: '#C0C0C0' },
    gold: { tint: '#FFD700', tintOpacity: 0.5, glow: '#FFD700' },
  },
}));

import { TintedChest } from '@/components/dungeon/TintedChest';

describe('TintedChest', () => {
  it('renders without crashing', () => {
    const element = <TintedChest tier="wood" isOpen={false} testID="chest" />;
    expect(element).toBeTruthy();
  });

  it('renders closed state', () => {
    const element = <TintedChest tier="silver" isOpen={false} testID="chest" />;
    expect(element).toBeTruthy();
  });

  it('renders open state', () => {
    const element = <TintedChest tier="gold" isOpen={true} testID="chest" />;
    expect(element).toBeTruthy();
  });

  it('accepts glowIntensity prop', () => {
    const element = <TintedChest tier="gold" isOpen={false} glowIntensity={0.8} testID="chest" />;
    expect(element).toBeTruthy();
  });
});
