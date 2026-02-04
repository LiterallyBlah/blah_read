/**
 * Session Results Data Aggregator
 *
 * Builds the complete data structure needed by the SessionResultsScreen.
 */

import { SessionRewardResult, ProcessedBonusDrop } from './sessionRewards';
import { Companion, LootBox } from '../shared';
import { NextMilestone, calculateNextMilestones } from '../shared/nextMilestone';
import { HeroEvent, detectHeroEvents } from '../ui/heroEvents';
import { AchievedMilestone } from './lootBox';
import { ConsumableDefinition, ConsumableEffectType, ConsumableTier } from '../consumables';

export interface LootBoxBreakdown {
  total: number;
  levelUp: number;
  bonusDrop: number;
  completion: number;
  achievement: number; // From legacy achievement system
  readingTime: number; // From legacy reading time milestones
}

export interface LootBoxOdds {
  luck: number;
  rareLuck: number;
  legendaryLuck: number;
  pityCounter: number;
}

/**
 * A consumable that dropped directly this session (not in a loot box)
 */
export interface DroppedConsumable {
  id: string;
  name: string;
  tier: ConsumableTier;
  effectType: ConsumableEffectType;
  description: string;
  duration: number;
}

export interface SessionResultsData {
  // Core rewards
  xpGained: number;
  baseXpBeforeBoosts: number;
  totalBoostMultiplier: number;
  streakMultiplier: number;
  sessionMinutes: number;

  // Loot boxes
  lootBoxBreakdown: LootBoxBreakdown;

  // Progress transitions
  bookLevel: { previous: number; current: number };
  playerLevel: { previous: number; current: number };
  genreLevels: Array<{ genre: string; previous: number; current: number }>;

  // Hero events (sorted by priority)
  heroEvents: HeroEvent[];

  // Next milestones
  nextMilestones: NextMilestone[];

  // Active effects for detail view
  activeEffects: {
    xpBoost: number;
    luck: number;
    rareLuck: number;
    legendaryLuck: number;
    dropRateBoost: number;
  };

  // Loot box odds for detail view
  lootBoxOdds: LootBoxOdds;

  // Companions unlocked this session (for reveal/recap)
  // Includes both reading time unlocks AND bonus drop companions
  unlockedCompanions: Array<{
    id: string;
    name: string;
    rarity: 'common' | 'rare' | 'legendary';
    type: 'character' | 'creature' | 'object';
    description: string;
    imageUrl: string | null;
    source: 'reading_time' | 'bonus_drop'; // How they were unlocked
  }>;

  // Loot boxes earned with tiers (for reveal/recap)
  // Includes tiered boxes AND legacy achievement/reading time boxes
  lootBoxesEarned: Array<{
    id: string;
    tier: 'wood' | 'silver' | 'gold';
    source: 'level_up' | 'bonus_drop' | 'completion' | 'achievement' | 'reading_time';
  }>;

  // Consumables dropped directly this session (not in loot boxes)
  droppedConsumables: DroppedConsumable[];

  // Achievement milestones hit this session (streaks, XP milestones, etc.)
  achievementMilestones: AchievedMilestone[];
}

/**
 * Additional data from legacy systems to include in results.
 */
export interface LegacyRewardData {
  // Companions unlocked via reading time milestones
  readingTimeCompanions: Companion[];
  // Loot boxes from reading time milestones
  readingTimeLootBoxes: LootBox[];
  // Achievement milestones hit and their boxes
  achievementMilestones: AchievedMilestone[];
  achievementLootBoxes: LootBox[];
}

/**
 * Build the complete session results data structure.
 * Combines session rewards with legacy milestone data.
 */
export function buildSessionResultsData(
  result: SessionRewardResult,
  sessionSeconds: number,
  legacyData: LegacyRewardData,
  previousStreak: number,
  newStreak: number
): SessionResultsData {
  // Calculate loot box breakdown - include both tiered and legacy boxes
  const lootBoxBreakdown: LootBoxBreakdown = {
    total: result.lootBoxes.length + legacyData.readingTimeLootBoxes.length + legacyData.achievementLootBoxes.length,
    levelUp: result.lootBoxes.filter(lb => lb.source === 'level_up').length,
    bonusDrop: result.lootBoxes.filter(lb => lb.source === 'bonus_drop').length,
    completion: result.lootBoxes.filter(lb => lb.source === 'completion').length,
    achievement: legacyData.achievementLootBoxes.length,
    readingTime: legacyData.readingTimeLootBoxes.length,
  };

  // Build genre level transitions
  const genreLevels: Array<{ genre: string; previous: number; current: number }> = [];
  for (const [genre, increase] of Object.entries(result.genreLevelIncreases)) {
    if (increase > 0) {
      const previous = result.previousGenreLevels[genre as keyof typeof result.previousGenreLevels] ?? 0;
      genreLevels.push({
        genre,
        previous,
        current: previous + increase,
      });
    }
  }

  // Calculate total boost multiplier
  const xpBoostMultiplier = 1 + result.activeEffects.xpBoost;
  const totalBoostMultiplier = xpBoostMultiplier * result.streakMultiplier;

  // Combine all unlocked companions from all sources
  const allUnlockedCompanions = [
    // Reading time unlocks (legacy)
    ...legacyData.readingTimeCompanions.map(c => ({
      id: c.id,
      name: c.name,
      rarity: c.rarity,
      type: c.type,
      description: c.description,
      imageUrl: c.imageUrl,
      source: 'reading_time' as const,
    })),
    // Bonus drop companions
    ...result.bonusDrops
      .filter((d): d is ProcessedBonusDrop & { companion: Companion } =>
        d.type === 'companion' && d.companion !== undefined)
      .map(d => ({
        id: d.companion.id,
        name: d.companion.name,
        rarity: d.companion.rarity,
        type: d.companion.type,
        description: d.companion.description,
        imageUrl: d.companion.imageUrl,
        source: 'bonus_drop' as const,
      })),
  ];

  // Detect hero events with all companions
  const heroEvents = detectHeroEvents(
    result,
    [...legacyData.readingTimeCompanions, ...result.bonusDrops.filter(d => d.type === 'companion').map(d => d.companion!).filter(Boolean)],
    previousStreak,
    newStreak
  );

  // Calculate next milestones
  const nextMilestones = calculateNextMilestones(result.updatedBook, result.updatedProgress);

  // Get current pity counter
  const pityCounter = result.updatedProgress.goldPityCounter ?? 0;

  // Extract dropped consumables from bonus drops
  const droppedConsumables: DroppedConsumable[] = result.bonusDrops
    .filter((d): d is ProcessedBonusDrop & { consumable: ConsumableDefinition } =>
      d.type === 'consumable' && d.consumable !== undefined)
    .map(d => ({
      id: d.consumable.id,
      name: d.consumable.name,
      tier: d.consumable.tier,
      effectType: d.consumable.effectType,
      description: d.consumable.description,
      duration: d.consumable.duration,
    }));

  // Combine all loot boxes earned
  const allLootBoxes = [
    // Tiered boxes
    ...result.lootBoxes.map(lb => ({
      id: lb.id,
      tier: lb.tier ?? 'wood' as const,
      source: lb.source as 'level_up' | 'bonus_drop' | 'completion',
    })),
    // Reading time milestone boxes (legacy)
    ...legacyData.readingTimeLootBoxes.map(lb => ({
      id: lb.id,
      tier: 'wood' as const, // Legacy boxes don't have tiers
      source: 'reading_time' as const,
    })),
    // Achievement boxes (legacy)
    ...legacyData.achievementLootBoxes.map(lb => ({
      id: lb.id,
      tier: 'wood' as const, // Legacy boxes don't have tiers
      source: 'achievement' as const,
    })),
  ];

  return {
    xpGained: result.xpGained,
    baseXpBeforeBoosts: result.baseXpBeforeBoosts,
    totalBoostMultiplier,
    streakMultiplier: result.streakMultiplier,
    sessionMinutes: Math.floor(sessionSeconds / 60),

    lootBoxBreakdown,

    bookLevel: {
      previous: result.previousBookLevel,
      current: result.newBookLevel,
    },
    playerLevel: {
      previous: result.previousPlayerLevel,
      current: result.updatedProgress.level ?? result.previousPlayerLevel,
    },
    genreLevels,

    heroEvents,
    nextMilestones,

    activeEffects: {
      xpBoost: result.activeEffects.xpBoost,
      luck: result.activeEffects.luck,
      rareLuck: result.activeEffects.rareLuck,
      legendaryLuck: result.activeEffects.legendaryLuck,
      dropRateBoost: result.activeEffects.dropRateBoost,
    },

    lootBoxOdds: {
      luck: result.activeEffects.luck,
      rareLuck: result.activeEffects.rareLuck,
      legendaryLuck: result.activeEffects.legendaryLuck,
      pityCounter,
    },

    unlockedCompanions: allUnlockedCompanions,
    lootBoxesEarned: allLootBoxes,
    droppedConsumables,
    achievementMilestones: legacyData.achievementMilestones,
  };
}
