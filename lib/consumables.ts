export type ConsumableTier = 'weak' | 'medium' | 'strong';
export type ConsumableEffectType =
  | 'xp_boost'
  | 'luck'           // was luck_boost
  | 'rare_luck'      // NEW
  | 'legendary_luck' // NEW
  | 'drop_rate_boost'
  | 'streak_shield'
  | 'box_upgrade'
  | 'guaranteed_companion'
  | 'instant_level';

export interface ConsumableDefinition {
  id: string;
  name: string;
  description: string;
  tier: ConsumableTier;
  effectType: ConsumableEffectType;
  magnitude: number;
  duration: number; // Duration in minutes, 0 = instant
}

export const CONSUMABLES: ConsumableDefinition[] = [
  // Weak (Wood box tier)
  { id: 'weak_xp_1', name: 'Minor XP Scroll', description: '+10% XP for 60 min', tier: 'weak', effectType: 'xp_boost', magnitude: 0.10, duration: 60 },
  { id: 'weak_luck_1', name: 'Lucky Penny', description: '+5% luck for 2 hours', tier: 'weak', effectType: 'luck', magnitude: 0.05, duration: 120 },
  { id: 'weak_drop_1', name: 'Treasure Map Scrap', description: '+10% drop rate for 60 min', tier: 'weak', effectType: 'drop_rate_boost', magnitude: 0.10, duration: 60 },
  { id: 'weak_streak_1', name: 'Calendar Page', description: '24h streak protection', tier: 'weak', effectType: 'streak_shield', magnitude: 1, duration: 0 },

  // Medium (Silver box tier) - now with rare_luck
  { id: 'med_xp_1', name: 'XP Scroll', description: '+25% XP for 90 min', tier: 'medium', effectType: 'xp_boost', magnitude: 0.25, duration: 90 },
  { id: 'med_luck_1', name: 'Four-Leaf Clover', description: '+10% luck for 3 hours', tier: 'medium', effectType: 'luck', magnitude: 0.10, duration: 180 },
  { id: 'med_rare_luck_1', name: 'Silver Horseshoe', description: '+10% rare luck for 3 hours', tier: 'medium', effectType: 'rare_luck', magnitude: 0.10, duration: 180 },
  { id: 'med_drop_1', name: 'Treasure Map', description: '+20% drop rate for 2 hours', tier: 'medium', effectType: 'drop_rate_boost', magnitude: 0.20, duration: 120 },
  { id: 'med_streak_1', name: 'Calendar', description: '72h streak protection', tier: 'medium', effectType: 'streak_shield', magnitude: 3, duration: 0 },
  { id: 'med_upgrade_1', name: 'Polish Kit', description: 'Upgrade next box tier', tier: 'medium', effectType: 'box_upgrade', magnitude: 1, duration: 0 },

  // Strong (Gold box tier) - now with all luck types
  { id: 'strong_xp_1', name: 'Double XP Tome', description: 'Double XP for 90 min', tier: 'strong', effectType: 'xp_boost', magnitude: 1.0, duration: 90 },
  { id: 'strong_xp_2', name: 'XP Blessing', description: '+50% XP for 4 hours', tier: 'strong', effectType: 'xp_boost', magnitude: 0.50, duration: 240 },
  { id: 'strong_luck_1', name: 'Luck Charm', description: '+15% luck for 5 hours', tier: 'strong', effectType: 'luck', magnitude: 0.15, duration: 300 },
  { id: 'strong_rare_luck_1', name: 'Silver Star', description: '+10% rare luck for 5 hours', tier: 'strong', effectType: 'rare_luck', magnitude: 0.10, duration: 300 },
  { id: 'strong_legendary_luck_1', name: 'Golden Aura', description: '+15% legendary luck for 5 hours', tier: 'strong', effectType: 'legendary_luck', magnitude: 0.15, duration: 300 },
  { id: 'strong_companion_1', name: 'Companion Summon', description: 'Guaranteed companion on next box', tier: 'strong', effectType: 'guaranteed_companion', magnitude: 1, duration: 0 },
  { id: 'strong_level_1', name: 'Time Warp', description: 'Level up book on next session', tier: 'strong', effectType: 'instant_level', magnitude: 1, duration: 0 },
];

export function getConsumablesByTier(tier: ConsumableTier): ConsumableDefinition[] {
  return CONSUMABLES.filter(c => c.tier === tier);
}

export function getConsumableById(id: string): ConsumableDefinition | undefined {
  return CONSUMABLES.find(c => c.id === id);
}

/**
 * Format a duration in minutes to a human-readable string.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}
