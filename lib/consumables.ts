export type ConsumableTier = 'weak' | 'medium' | 'strong';
export type ConsumableEffectType =
  | 'xp_boost'
  | 'luck_boost'
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
  duration: number; // Number of sessions or uses, 0 = instant
}

export const CONSUMABLES: ConsumableDefinition[] = [
  // Weak (Wood box tier)
  { id: 'weak_xp_1', name: 'Minor XP Scroll', description: '+10% XP next session', tier: 'weak', effectType: 'xp_boost', magnitude: 0.10, duration: 1 },
  { id: 'weak_luck_1', name: 'Lucky Penny', description: '+5% luck next 2 sessions', tier: 'weak', effectType: 'luck_boost', magnitude: 0.05, duration: 2 },
  { id: 'weak_drop_1', name: 'Treasure Map Scrap', description: '+10% drop rate on next level up', tier: 'weak', effectType: 'drop_rate_boost', magnitude: 0.10, duration: 1 },
  { id: 'weak_streak_1', name: 'Calendar Page', description: '1-day streak shield', tier: 'weak', effectType: 'streak_shield', magnitude: 1, duration: 1 },

  // Medium (Silver box tier)
  { id: 'med_xp_1', name: 'XP Scroll', description: '+25% XP next session', tier: 'medium', effectType: 'xp_boost', magnitude: 0.25, duration: 1 },
  { id: 'med_luck_1', name: 'Four-Leaf Clover', description: '+15% luck next 3 sessions', tier: 'medium', effectType: 'luck_boost', magnitude: 0.15, duration: 3 },
  { id: 'med_drop_1', name: 'Treasure Map', description: '+20% drop rate next 2 level ups', tier: 'medium', effectType: 'drop_rate_boost', magnitude: 0.20, duration: 2 },
  { id: 'med_streak_1', name: 'Calendar', description: '3-day streak shield', tier: 'medium', effectType: 'streak_shield', magnitude: 3, duration: 1 },
  { id: 'med_upgrade_1', name: 'Polish Kit', description: 'Upgrade next box tier', tier: 'medium', effectType: 'box_upgrade', magnitude: 1, duration: 1 },

  // Strong (Gold box tier)
  { id: 'strong_xp_1', name: 'Double XP Tome', description: 'Double XP next session', tier: 'strong', effectType: 'xp_boost', magnitude: 1.0, duration: 1 },
  { id: 'strong_xp_2', name: 'XP Blessing', description: '+50% XP for 3 sessions', tier: 'strong', effectType: 'xp_boost', magnitude: 0.50, duration: 3 },
  { id: 'strong_luck_1', name: 'Luck Charm', description: '+30% luck for 5 sessions', tier: 'strong', effectType: 'luck_boost', magnitude: 0.30, duration: 5 },
  { id: 'strong_companion_1', name: 'Companion Summon', description: 'Guaranteed companion on next box', tier: 'strong', effectType: 'guaranteed_companion', magnitude: 1, duration: 1 },
  { id: 'strong_level_1', name: 'Time Warp', description: 'Instant level up on current book', tier: 'strong', effectType: 'instant_level', magnitude: 1, duration: 0 },
];

export function getConsumablesByTier(tier: ConsumableTier): ConsumableDefinition[] {
  return CONSUMABLES.filter(c => c.tier === tier);
}

export function getConsumableById(id: string): ConsumableDefinition | undefined {
  return CONSUMABLES.find(c => c.id === id);
}
