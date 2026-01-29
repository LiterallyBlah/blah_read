// lib/themes/dungeon.ts
export const COLORS_DUNGEON = {
  // Backgrounds
  background: '#1a1a1a',      // Deep stone
  backgroundLight: '#252525',
  backgroundCard: '#2d2d2d',
  surface: '#2d2d2d',         // Stone
  card: '#3a3a3a',            // Light stone

  // Text
  primary: '#f5deb3',
  primaryMuted: '#c4a574',
  text: '#f5deb3',            // Parchment
  textSecondary: '#c4a574',   // Aged parchment
  textMuted: '#7a6a5a',       // Faded

  // Borders
  border: '#4a4a4a',          // Stone edge
  secondary: '#4a4a4a',
  accent: '#ffb347',          // Torchlight/amber

  // Status
  success: '#4a7c4e',         // Dungeon green
  error: '#8b3a3a',           // Dark red
  warning: '#b8860b',         // Dark gold

  // Rarity (loot box tiers)
  rarityCommon: '#8b4513',    // Wood brown
  rarityRare: '#c0c0c0',      // Silver
  rarityEpic: '#9B59B6',      // Purple (kept for compatibility)
  rarityLegendary: '#ffd700', // Gold

  // Prestige tiers (kept for compatibility)
  prestigeBronze: '#CD7F32',
  prestigeSilver: '#C0C0C0',
  prestigeGold: '#FFD700',
  prestigePlatinum: '#E5E4E2',
  prestigeDiamond: '#B9F2FF',
} as const;
