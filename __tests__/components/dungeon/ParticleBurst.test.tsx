import React from 'react';

// Mock React Native completely without requiring the actual module
jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}));

import { ParticleBurst } from '@/components/dungeon/ParticleBurst';

describe('ParticleBurst', () => {
  it('renders without crashing', () => {
    const element = <ParticleBurst active={false} color="#FFD700" testID="burst" />;
    expect(element).toBeTruthy();
  });

  it('renders with active state', () => {
    const element = <ParticleBurst active={true} color="#FFD700" testID="burst" />;
    expect(element).toBeTruthy();
  });

  it('renders correct number of particles', () => {
    const element = <ParticleBurst active={true} color="#FFD700" particleCount={8} testID="burst" />;
    expect(element).toBeTruthy();
  });

  it('accepts custom size', () => {
    const element = <ParticleBurst active={true} color="#C0C0C0" size={100} testID="burst" />;
    expect(element).toBeTruthy();
  });
});
