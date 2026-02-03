import React from 'react';
// @ts-expect-error - react-test-renderer types not needed for this test
import TestRenderer from 'react-test-renderer';

// Mock React Native completely without requiring the actual module
jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
    absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  },
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Svg: 'Svg',
  Defs: 'Defs',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
  Rect: 'Rect',
}));

import { ItemGlow } from '@/components/dungeon/ItemGlow';

describe('ItemGlow', () => {
  it('renders without crashing', () => {
    const element = <ItemGlow rarity="common" intensity={0.5} testID="glow" />;
    expect(element).toBeTruthy();
  });

  it('renders for all rarities', () => {
    const commonElement = <ItemGlow rarity="common" intensity={0.5} testID="glow" />;
    expect(commonElement).toBeTruthy();

    const rareElement = <ItemGlow rarity="rare" intensity={0.5} testID="glow" />;
    expect(rareElement).toBeTruthy();

    const legendaryElement = <ItemGlow rarity="legendary" intensity={0.5} testID="glow" />;
    expect(legendaryElement).toBeTruthy();
  });

  it('accepts custom size', () => {
    const element = <ItemGlow rarity="legendary" intensity={1} size={120} testID="glow" />;
    expect(element).toBeTruthy();
  });

  it('returns null when intensity is 0', () => {
    const testRenderer = TestRenderer.create(
      <ItemGlow rarity="common" intensity={0} testID="glow" />
    );
    expect(testRenderer.toJSON()).toBeNull();
  });
});
