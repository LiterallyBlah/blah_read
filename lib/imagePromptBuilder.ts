import type { CompanionRarity } from './types';

/**
 * Get the border instruction for a given rarity level.
 * Only the relevant rarity instruction is provided to avoid confusing the LLM.
 */
export function getBorderInstruction(rarity: CompanionRarity): string {
  switch (rarity) {
    case 'common':
      return 'The sprite should have NO border or frame. Clean edges directly against the white background.';
    case 'rare':
      return 'Add a decorative border in blue (#4A90D9), 2-3 pixels wide. You have creative freedom over the pattern - simple lines, dotted edges, small flourishes, or geometric designs all work.';
    case 'legendary':
      return 'Add an ornate border in gold (#F1C40F), 2-3 pixels wide. Make it feel prestigious - you have creative freedom over the pattern. Could be elegant filigree, royal motifs, shimmering edges, or other special designs.';
  }
}
