import type {
  Companion,
  CompanionQueue,
  CompanionRarity,
  CompanionType,
  Genre,
} from './shared';
import { generateBatchId } from './shared';
import { rollCompanionEffects } from './companionEffects';

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
        },
        required: ['name', 'type', 'rarity', 'description', 'role', 'traits', 'physicalDescription'],
      },
    },
    researchConfidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['companions', 'researchConfidence'],
};

export interface ResearchResponse {
  companions: Array<{
    name: string;
    type: CompanionType;
    rarity: CompanionRarity;
    description: string;
    role: string;
    traits: string;
    physicalDescription: string;
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
 * Parse the structured response from the LLM into Companion objects
 * Effects are rolled based on rarity probability, not from LLM
 */
export function parseResearchResponse(
  response: ResearchResponse,
  bookId: string,
  bookGenres?: Genre[]
): ParsedResearch {
  const companions: Companion[] = response.companions.map((item, index) => {
    // Roll effects based on rarity probability
    const effects = rollCompanionEffects(item.rarity, bookGenres);

    return {
      id: generateBatchId(`${bookId}-companion`, index),
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
 * - Reading-time queue contains all rarities, shuffled
 * - Rarity is determined at unlock time via RNG with milestone-based odds
 * - Earlier milestones favor commons, later milestones favor rares/legendaries
 * - One legendary reserved for reading-time (RNG pool)
 * - One legendary reserved for pool (gold loot box pull)
 * - One legendary reserved for book completion
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
  // - readingTimeLegendary: Third legendary, for reading time milestones
  // IMPORTANT: Each queue gets a UNIQUE legendary to prevent duplication
  let completionLegendary: Companion | null = null;
  let poolLegendary: Companion | null = null;
  let readingTimeLegendary: Companion | null = null;

  if (shuffledLegendaries.length >= 3) {
    // All three queues get unique legendaries
    completionLegendary = shuffledLegendaries[0];
    poolLegendary = shuffledLegendaries[1];
    readingTimeLegendary = shuffledLegendaries[2];
  } else if (shuffledLegendaries.length === 2) {
    // Two legendaries: completion and pool get them, reading-time gets none
    completionLegendary = shuffledLegendaries[0];
    poolLegendary = shuffledLegendaries[1];
    // No reading time legendary - ensures no duplication
    readingTimeLegendary = null;
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

  // Build reading-time queue with all rarities available
  // Order doesn't matter - unlock uses RNG-based rarity selection per milestone
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
