// Follows BlahFret design system - monochrome typewriter aesthetic

export const COLORS = {
  // Backgrounds
  background: '#0a0a0a',
  backgroundLight: '#141414',
  backgroundCard: '#1a1a1a',
  surface: '#1a1a1a', // Alias for backgroundCard

  // Text
  primary: '#ffffff',
  primaryMuted: '#e0e0e0',
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#555555',

  // Borders
  border: '#2a2a2a',
  secondary: '#2a2a2a',
  accent: '#3a3a3a',

  // Status
  success: '#00ff88',
  error: '#ff4444',
  warning: '#ffaa00',

  // Rarity (for loot/companions)
  rarityCommon: '#555555',
  rarityRare: '#4A90D9',
  rarityEpic: '#9B59B6',
  rarityLegendary: '#F1C40F',

  // Prestige tiers
  prestigeBronze: '#CD7F32',
  prestigeSilver: '#C0C0C0',
  prestigeGold: '#FFD700',
  prestigePlatinum: '#E5E4E2',
  prestigeDiamond: '#B9F2FF',
} as const;

export const COLORS_LIGHT = {
  // Backgrounds (inverted)
  background: '#ffffff',
  backgroundLight: '#f5f5f5',
  backgroundCard: '#f0f0f0',
  surface: '#f0f0f0',

  // Text (inverted)
  primary: '#0a0a0a',
  primaryMuted: '#333333',
  text: '#0a0a0a',
  textSecondary: '#555555',
  textMuted: '#888888',

  // Borders (inverted)
  border: '#e0e0e0',
  secondary: '#e0e0e0',
  accent: '#d0d0d0',

  // Status (unchanged)
  success: '#00ff88',
  error: '#ff4444',
  warning: '#ffaa00',

  // Rarity (unchanged)
  rarityCommon: '#555555',
  rarityRare: '#4A90D9',
  rarityEpic: '#9B59B6',
  rarityLegendary: '#F1C40F',

  // Prestige (unchanged)
  prestigeBronze: '#CD7F32',
  prestigeSilver: '#C0C0C0',
  prestigeGold: '#FFD700',
  prestigePlatinum: '#E5E4E2',
  prestigeDiamond: '#B9F2FF',
} as const;

export { COLORS_DUNGEON } from './themes/dungeon';

export const FONTS = {
  mono: 'Courier',
  monoWeight: '400' as const,
  monoBold: '700' as const,
};

// Base spacing unit is 4px, matches design system
export const spacing = (units: number) => units * 4;

// Type scale matching design system
export const fontSize = (size: 'micro' | 'small' | 'body' | 'large' | 'title' | 'hero') => {
  const sizes = { micro: 10, small: 12, body: 14, large: 18, title: 28, hero: 48 };
  return sizes[size];
};

// Letter spacing conventions from design system
export const letterSpacing = (type: 'tight' | 'normal' | 'wide' | 'hero') => {
  const spacings = { tight: 1, normal: 2, wide: 3, hero: 4 };
  return spacings[type];
};
