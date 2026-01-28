import type {
  Companion,
  CompanionQueue,
  CompanionRarity,
  CompanionType,
} from './types';
import type { CompanionEffect, EffectType } from './companionEffects';
import type { Genre } from './genres';
import { GENRES, isValidGenre } from './genres';
import { EFFECT_TYPES, calculateEffectMagnitude } from './companionEffects';

/**
 * Structured output schema for OpenRouter
 */
export const RESEARCH_SCHEMA = {
  type: 'object',
  properties: {
    companions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['character', 'creature', 'object'] },
          rarity: { type: 'string', enum: ['common', 'rare', 'legendary'] },
          description: { type: 'string' },
          role: { type: 'string' },
          traits: { type: 'string' },
          physicalDescription: { type: 'string' },
          effects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['xp_boost', 'luck_boost', 'drop_rate_boost', 'completion_bonus'] },
                targetGenre: { type: 'string' },
              },
              required: ['type'],
            },
          },
        },
        required: ['name', 'type', 'rarity', 'description', 'role', 'traits', 'physicalDescription', 'effects'],
      },
    },
    researchConfidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['companions', 'researchConfidence'],
};

/**
 * Effect data as returned from the LLM (without magnitude)
 */
export interface LLMEffectData {
  type: string;
  targetGenre?: string;
}

export interface ResearchResponse {
  companions: Array<{
    name: string;
    type: CompanionType;
    rarity: CompanionRarity;
    description: string;
    role: string;
    traits: string;
    physicalDescription: string;
    effects: LLMEffectData[];
  }>;
  researchConfidence: 'high' | 'medium' | 'low';
}

export interface ParsedResearch {
  companions: Companion[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Build the research prompt for the LLM
 */
export function buildResearchPrompt(title: string, author?: string): string {
  const authorPart = author ? ` by ${author}` : '';
  const genreList = GENRES.join(', ');

  return `Research the book "${title}"${authorPart} and identify up to 15 notable entities from it.

For each entity, provide:
- name: The entity's name
- type: One of "character", "creature", or "object"
- rarity: Based on narrative importance:
  - "legendary": Protagonist, main antagonist, or the single most iconic element (2-3 max)
  - "rare": Important supporting characters, significant creatures, notable items (3-5)
  - "common": Minor characters, background creatures, everyday objects (remaining)
- description: 1-2 sentences about who/what they are
- role: Their role in the story
- traits: Notable personality traits or abilities
- physicalDescription: Physical appearance ONLY - body type, coloring, clothing, features, expressions, size. Do NOT include art style, framing, backgrounds, or borders.
- effects: 1-2 special abilities that provide gameplay bonuses (see below)

EFFECTS:
Each companion should have 1-2 effects. Choose effect types that thematically fit the entity:

Effect types:
- "xp_boost": Increases XP gained. Best for scholarly, wise, or mentor-type entities. Can target a specific genre.
- "luck_boost": Improves loot box tier chances. Best for lucky, magical, or fortune-related entities.
- "drop_rate_boost": Chance for bonus loot drops. Best for resourceful, treasure-hunting, or generous entities.
- "completion_bonus": Extra levels awarded on book completion. ONLY for legendary companions (max 1 per book). Best for achievement-oriented or heroic entities.

For xp_boost effects, you may optionally specify a targetGenre if the entity strongly relates to a specific genre.
Valid genres: ${genreList}

Effect format example:
[
  { "type": "xp_boost", "targetGenre": "fantasy" },
  { "type": "luck_boost" }
]

Guidelines for effects:
- Match effects to the entity's character (a wizard might boost fantasy XP, a thief might boost drop rates)
- Common companions: 1 effect
- Rare companions: 1-2 effects
- Legendary companions: 2 effects, and ONE legendary per book may have "completion_bonus"
- DO NOT include magnitude values - these are calculated separately based on rarity

Focus on:
1. Main characters (protagonist, antagonist, key supporting cast)
2. Memorable creatures or beings
3. Iconic objects central to the story

Set researchConfidence to:
- "high" if this is a well-known book with clear information
- "medium" if information is partial or the book is less known
- "low" if you cannot find reliable information about this book

Return exactly the JSON structure requested.`;
}

/**
 * Validate and convert LLM effect data to CompanionEffect with magnitude
 */
function parseEffect(effectData: LLMEffectData, rarity: CompanionRarity): CompanionEffect | null {
  // Validate effect type
  if (!EFFECT_TYPES.includes(effectData.type as EffectType)) {
    return null;
  }

  const effectType = effectData.type as EffectType;

  // completion_bonus is only valid for legendary companions
  if (effectType === 'completion_bonus' && rarity !== 'legendary') {
    return null;
  }

  // Calculate magnitude based on rarity
  const magnitude = calculateEffectMagnitude(rarity);

  // Validate targetGenre if provided
  let targetGenre: Genre | undefined;
  if (effectData.targetGenre) {
    if (isValidGenre(effectData.targetGenre)) {
      targetGenre = effectData.targetGenre;
    }
    // If invalid genre, we just ignore the targetGenre (effect becomes global)
  }

  return {
    type: effectType,
    magnitude,
    targetGenre,
  };
}

/**
 * Parse the structured response from the LLM into Companion objects
 */
export function parseResearchResponse(
  response: ResearchResponse,
  bookId: string
): ParsedResearch {
  const companions: Companion[] = response.companions.map((item, index) => {
    // Parse and validate effects
    const effects: CompanionEffect[] = (item.effects || [])
      .map(e => parseEffect(e, item.rarity))
      .filter((e): e is CompanionEffect => e !== null);

    return {
      id: `${bookId}-companion-${index}-${Date.now()}`,
      bookId,
      name: item.name,
      type: item.type,
      rarity: item.rarity,
      description: item.description,
      traits: item.traits,
      visualDescription: '', // Keep for backwards compatibility
      physicalDescription: item.physicalDescription,
      imageUrl: null,
      source: 'discovered' as const,
      unlockMethod: null,
      unlockedAt: null,
      effects: effects.length > 0 ? effects : undefined,
    };
  });

  return {
    companions,
    confidence: response.researchConfidence,
  };
}

/**
 * Shuffle array in place using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Assign companions to reading-time queue and pool queue
 *
 * Strategy:
 * - Higher importance (legendary, rare) prefer reading-time queue
 * - One legendary reserved for reading-time (5hr milestone)
 * - One legendary reserved for pool (lucky loot box pull)
 * - One legendary reserved for book completion
 * - Randomize order within each queue
 *
 * Legendary designation:
 * - completionLegendary: Awarded when user finishes reading the book
 * - poolLegendary: Can be won from gold loot boxes
 */
export function assignCompanionQueues(companions: Companion[]): {
  readingTimeQueue: CompanionQueue;
  poolQueue: CompanionQueue;
  completionLegendary: Companion | null;
  poolLegendary: Companion | null;
} {
  // Sort by rarity importance
  const legendaries = companions.filter(c => c.rarity === 'legendary');
  const rares = companions.filter(c => c.rarity === 'rare');
  const commons = companions.filter(c => c.rarity === 'common');

  // Shuffle each rarity group
  const shuffledLegendaries = shuffleArray(legendaries);
  const shuffledRares = shuffleArray(rares);
  const shuffledCommons = shuffleArray(commons);

  // Allocate legendaries with clear designation:
  // - completionLegendary: First legendary, awarded when user finishes the book
  // - poolLegendary: Second legendary, available in gold loot boxes
  // - readingTimeLegendary: Third legendary (or reuse), for reading time milestones
  let completionLegendary: Companion | null = null;
  let poolLegendary: Companion | null = null;
  let readingTimeLegendary: Companion | null = null;

  if (shuffledLegendaries.length >= 2) {
    // First legendary is completion reward
    completionLegendary = shuffledLegendaries[0];
    // Second legendary goes to loot pool
    poolLegendary = shuffledLegendaries[1];
    // Third (or second) for reading time
    readingTimeLegendary = shuffledLegendaries[2] || shuffledLegendaries[1];
  } else if (shuffledLegendaries.length === 1) {
    // If only one legendary, prioritize completion reward
    completionLegendary = shuffledLegendaries[0];
    // No pool legendary if only one exists
    poolLegendary = null;
    readingTimeLegendary = null;
  }

  // Split rares: ~half to reading-time, ~half to pool
  const raresForReadingTime = shuffledRares.slice(0, Math.ceil(shuffledRares.length / 2));
  const raresForPool = shuffledRares.slice(Math.ceil(shuffledRares.length / 2));

  // Split commons: ~half to reading-time, ~half to pool
  const commonsForReadingTime = shuffledCommons.slice(0, Math.ceil(shuffledCommons.length / 2));
  const commonsForPool = shuffledCommons.slice(Math.ceil(shuffledCommons.length / 2));

  // Build reading-time queue (higher importance first, then randomize)
  const readingTimeCompanions = shuffleArray([
    ...(readingTimeLegendary ? [readingTimeLegendary] : []),
    ...raresForReadingTime,
    ...commonsForReadingTime,
  ]);

  // Build pool queue
  const poolCompanions = shuffleArray([
    ...(poolLegendary ? [poolLegendary] : []),
    ...raresForPool,
    ...commonsForPool,
  ]);

  return {
    readingTimeQueue: {
      companions: readingTimeCompanions,
      nextGenerateIndex: 0,
    },
    poolQueue: {
      companions: poolCompanions,
      nextGenerateIndex: 0,
    },
    completionLegendary,
    poolLegendary,
  };
}
