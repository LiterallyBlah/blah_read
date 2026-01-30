/**
 * Session Results Data Aggregator
 *
 * Builds the complete data structure needed by the SessionResultsScreen.
 */

import { SessionRewardResult } from './sessionRewards';
import { Companion } from './types';
import { HeroEvent, detectHeroEvents } from './heroEvents';
import { NextMilestone, calculateNextMilestones } from './nextMilestone';

export interface LootBoxBreakdown {
  total: number;
  levelUp: number;
  bonusDrop: number;
  completion: number;
}

export interface LootBoxOdds {
  luck: number;
  rareLuck: number;
  legendaryLuck: number;
  pityCounter: number;
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
  unlockedCompanions: Array<{
    id: string;
    name: string;
    rarity: 'common' | 'rare' | 'legendary';
    type: 'character' | 'creature' | 'object';
    description: string;
    imageUrl: string | null;
  }>;

  // Loot boxes earned with tiers (for reveal/recap)
  lootBoxesEarned: Array<{
    id: string;
    tier: 'wood' | 'silver' | 'gold';
    source: 'level_up' | 'bonus_drop' | 'completion';
  }>;
}

/**
 * Build the complete session results data structure.
 */
export function buildSessionResultsData(
  result: SessionRewardResult,
  sessionSeconds: number,
  unlockedCompanions: Companion[],
  previousStreak: number,
  newStreak: number
): SessionResultsData {
  // Calculate loot box breakdown
  const lootBoxBreakdown: LootBoxBreakdown = {
    total: result.lootBoxes.length,
    levelUp: result.lootBoxes.filter(lb => lb.source === 'level_up').length,
    bonusDrop: result.lootBoxes.filter(lb => lb.source === 'bonus_drop').length,
    completion: result.lootBoxes.filter(lb => lb.source === 'completion').length,
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

  // Detect hero events
  const heroEvents = detectHeroEvents(result, unlockedCompanions, previousStreak, newStreak);

  // Calculate next milestones
  const nextMilestones = calculateNextMilestones(result.updatedBook, result.updatedProgress);

  // Get current pity counter
  const pityCounter = result.updatedProgress.goldPityCounter ?? 0;

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

    // New fields for reveal/recap
    unlockedCompanions: unlockedCompanions.map(c => ({
      id: c.id,
      name: c.name,
      rarity: c.rarity,
      type: c.type,
      description: c.description,
      imageUrl: c.imageUrl,
    })),

    lootBoxesEarned: result.lootBoxes.map(lb => ({
      id: lb.id,
      tier: lb.tier!, // Now always defined since we roll at earn time
      source: lb.source,
    })),
  };
}
