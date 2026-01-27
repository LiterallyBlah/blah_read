# Companion System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the single-companion system into ~15 collectible companions per book with reading-time unlocks and loot boxes.

**Architecture:** LLM research via OpenRouter online models identifies characters/creatures/objects on book add. Companions split into reading-time queue (milestone unlocks) and pool queue (loot box unlocks). Lazy image generation with buffering ensures instant reveals.

**Tech Stack:** React Native/Expo, TypeScript, AsyncStorage, OpenRouter API (online models + structured outputs)

---

## Task 1: Define New Type Definitions

**Files:**
- Modify: `lib/types.ts`

**Step 1: Add companion rarity and type enums**

Add after line 1:

```typescript
export type CompanionRarity = 'common' | 'rare' | 'legendary';
export type CompanionType = 'character' | 'creature' | 'object';
export type CompanionSource = 'discovered' | 'inspired';
export type CompanionUnlockMethod = 'reading_time' | 'loot_box' | 'book_completion';
```

**Step 2: Replace the Companion interface**

Replace lines 34-42 with:

```typescript
export interface Companion {
  id: string;
  bookId: string;
  name: string;
  type: CompanionType;
  rarity: CompanionRarity;
  description: string;
  traits: string;
  visualDescription: string;
  imageUrl: string | null;
  source: CompanionSource;
  unlockMethod: CompanionUnlockMethod | null;
  unlockedAt: number | null;
  // Legacy fields for migration
  archetype?: string;
  creature?: string;
  keywords?: string[];
  generatedAt?: number;
}
```

**Step 3: Add companion queue types**

Add after Companion interface:

```typescript
export interface CompanionQueue {
  companions: Companion[];
  nextGenerateIndex: number;
}

export interface BookCompanions {
  researchComplete: boolean;
  researchConfidence: 'high' | 'medium' | 'low';
  readingTimeQueue: CompanionQueue;
  poolQueue: CompanionQueue;
  unlockedCompanions: Companion[];
}
```

**Step 4: Add loot box types**

Add after BookCompanions:

```typescript
export interface LootBox {
  id: string;
  earnedAt: number;
  source: string; // e.g., "streak_7", "xp_250", "book_finished"
}

export interface LootBoxState {
  availableBoxes: LootBox[];
  openHistory: Array<{
    boxId: string;
    openedAt: number;
    companionId: string;
  }>;
}
```

**Step 5: Update Book interface**

In the Book interface, replace `companion?: Companion;` with:

```typescript
  companions?: BookCompanions;
  // Legacy field for migration
  companion?: Companion;
```

**Step 6: Update UserProgress interface**

Add to UserProgress interface (after lootItems):

```typescript
  lootBoxes: LootBoxState;
  // Achievement tracking for loot box rewards
  booksFinished: number;
  booksAdded: number;
  totalHoursRead: number;
```

**Step 7: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add companion collection type definitions

- CompanionRarity, CompanionType, CompanionSource enums
- Enhanced Companion interface with name, traits, visualDescription
- CompanionQueue and BookCompanions for per-book tracking
- LootBox and LootBoxState for loot box system
- Updated Book and UserProgress interfaces"
```

---

## Task 2: Create Companion Research Service

**Files:**
- Create: `lib/companionResearch.ts`
- Create: `__tests__/lib/companionResearch.test.ts`

**Step 1: Write the test file**

```typescript
import {
  buildResearchPrompt,
  parseResearchResponse,
  assignCompanionQueues,
} from '../lib/companionResearch';
import type { Companion } from '../lib/types';

describe('companionResearch', () => {
  describe('buildResearchPrompt', () => {
    it('builds prompt with title and author', () => {
      const prompt = buildResearchPrompt('The Hobbit', 'J.R.R. Tolkien');
      expect(prompt).toContain('The Hobbit');
      expect(prompt).toContain('J.R.R. Tolkien');
      expect(prompt).toContain('characters');
      expect(prompt).toContain('creatures');
      expect(prompt).toContain('objects');
    });

    it('handles missing author', () => {
      const prompt = buildResearchPrompt('Unknown Book', undefined);
      expect(prompt).toContain('Unknown Book');
      expect(prompt).not.toContain('undefined');
    });
  });

  describe('parseResearchResponse', () => {
    it('parses valid structured response', () => {
      const response = {
        companions: [
          {
            name: 'Bilbo Baggins',
            type: 'character',
            rarity: 'legendary',
            description: 'A hobbit who goes on an adventure',
            role: 'Protagonist',
            traits: 'Brave, curious, resourceful',
            visualDescription: 'Small hobbit with curly hair and bare feet',
          },
          {
            name: 'Smaug',
            type: 'creature',
            rarity: 'legendary',
            description: 'A fearsome dragon',
            role: 'Antagonist',
            traits: 'Greedy, cunning, powerful',
            visualDescription: 'Large red dragon with golden eyes',
          },
        ],
        researchConfidence: 'high',
      };

      const result = parseResearchResponse(response, 'book-123');
      expect(result.companions).toHaveLength(2);
      expect(result.confidence).toBe('high');
      expect(result.companions[0].name).toBe('Bilbo Baggins');
      expect(result.companions[0].bookId).toBe('book-123');
      expect(result.companions[0].source).toBe('discovered');
    });

    it('handles empty response', () => {
      const result = parseResearchResponse({ companions: [], researchConfidence: 'low' }, 'book-123');
      expect(result.companions).toHaveLength(0);
      expect(result.confidence).toBe('low');
    });
  });

  describe('assignCompanionQueues', () => {
    const mockCompanions: Companion[] = [
      { id: '1', bookId: 'b1', name: 'Hero', type: 'character', rarity: 'legendary', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '2', bookId: 'b1', name: 'Villain', type: 'character', rarity: 'legendary', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '3', bookId: 'b1', name: 'Sidekick', type: 'character', rarity: 'rare', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '4', bookId: 'b1', name: 'Beast', type: 'creature', rarity: 'rare', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '5', bookId: 'b1', name: 'Sword', type: 'object', rarity: 'rare', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '6', bookId: 'b1', name: 'Guard1', type: 'character', rarity: 'common', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '7', bookId: 'b1', name: 'Guard2', type: 'character', rarity: 'common', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
      { id: '8', bookId: 'b1', name: 'Guard3', type: 'character', rarity: 'common', description: '', traits: '', visualDescription: '', imageUrl: null, source: 'discovered', unlockMethod: null, unlockedAt: null },
    ];

    it('splits companions into reading-time and pool queues', () => {
      const result = assignCompanionQueues(mockCompanions);

      // Should have companions in both queues
      expect(result.readingTimeQueue.companions.length).toBeGreaterThan(0);
      expect(result.poolQueue.companions.length).toBeGreaterThan(0);

      // Total should equal input
      const total = result.readingTimeQueue.companions.length + result.poolQueue.companions.length;
      expect(total).toBe(mockCompanions.length);
    });

    it('ensures one legendary in reading-time queue', () => {
      const result = assignCompanionQueues(mockCompanions);
      const legendariesInReadingTime = result.readingTimeQueue.companions.filter(c => c.rarity === 'legendary');
      expect(legendariesInReadingTime.length).toBeGreaterThanOrEqual(1);
    });

    it('reserves one legendary for book completion', () => {
      const result = assignCompanionQueues(mockCompanions);
      const legendariesInPool = result.poolQueue.companions.filter(c => c.rarity === 'legendary');
      // At least one legendary should be in pool (for potential book completion)
      expect(legendariesInPool.length).toBeGreaterThanOrEqual(1);
    });

    it('randomizes order within queues', () => {
      // Run multiple times to verify randomization
      const results = Array.from({ length: 10 }, () => assignCompanionQueues(mockCompanions));
      const firstNames = results.map(r => r.readingTimeQueue.companions[0]?.name);
      // Not all first items should be the same (probabilistic but very likely)
      const uniqueFirstNames = new Set(firstNames);
      expect(uniqueFirstNames.size).toBeGreaterThan(1);
    });

    it('initializes nextGenerateIndex to 0', () => {
      const result = assignCompanionQueues(mockCompanions);
      expect(result.readingTimeQueue.nextGenerateIndex).toBe(0);
      expect(result.poolQueue.nextGenerateIndex).toBe(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/companionResearch.test.ts
```

Expected: FAIL with "Cannot find module '../lib/companionResearch'"

**Step 3: Write the implementation**

Create `lib/companionResearch.ts`:

```typescript
import type {
  Companion,
  CompanionQueue,
  CompanionRarity,
  CompanionType,
} from './types';

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
          visualDescription: { type: 'string' },
        },
        required: ['name', 'type', 'rarity', 'description', 'role', 'traits', 'visualDescription'],
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
    visualDescription: string;
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
- visualDescription: Physical appearance details for creating pixel art (colors, features, size, distinctive elements)

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
 */
export function parseResearchResponse(
  response: ResearchResponse,
  bookId: string
): ParsedResearch {
  const companions: Companion[] = response.companions.map((item, index) => ({
    id: `${bookId}-companion-${index}-${Date.now()}`,
    bookId,
    name: item.name,
    type: item.type,
    rarity: item.rarity,
    description: item.description,
    traits: item.traits,
    visualDescription: item.visualDescription,
    imageUrl: null,
    source: 'discovered' as const,
    unlockMethod: null,
    unlockedAt: null,
  }));

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
 */
export function assignCompanionQueues(companions: Companion[]): {
  readingTimeQueue: CompanionQueue;
  poolQueue: CompanionQueue;
  completionLegendary: Companion | null;
} {
  // Sort by rarity importance
  const legendaries = companions.filter(c => c.rarity === 'legendary');
  const rares = companions.filter(c => c.rarity === 'rare');
  const commons = companions.filter(c => c.rarity === 'common');

  // Shuffle each rarity group
  const shuffledLegendaries = shuffleArray(legendaries);
  const shuffledRares = shuffleArray(rares);
  const shuffledCommons = shuffleArray(commons);

  // Allocate legendaries: 1 for reading-time, 1 for pool, 1 for completion
  const readingTimeLegendary = shuffledLegendaries[0] || null;
  const poolLegendary = shuffledLegendaries[1] || null;
  const completionLegendary = shuffledLegendaries[2] || shuffledLegendaries[1] || shuffledLegendaries[0] || null;

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
  };
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/companionResearch.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/companionResearch.ts __tests__/lib/companionResearch.test.ts
git commit -m "feat(research): add companion research service

- buildResearchPrompt() for LLM book research
- parseResearchResponse() converts API response to Companion[]
- assignCompanionQueues() splits into reading-time and pool
- RESEARCH_SCHEMA for OpenRouter structured outputs"
```

---

## Task 3: Create Online LLM Research API Call

**Files:**
- Modify: `lib/llm.ts`
- Create: `__tests__/lib/llm.test.ts`

**Step 1: Write tests for the new research function**

Create `__tests__/lib/llm.test.ts`:

```typescript
import { buildResearchRequest } from '../lib/llm';
import { RESEARCH_SCHEMA } from '../lib/companionResearch';

describe('llm', () => {
  describe('buildResearchRequest', () => {
    it('builds request with online model suffix', () => {
      const request = buildResearchRequest(
        'test-api-key',
        'Research this book',
        'google/gemini-2.5-flash-preview-05-20'
      );

      expect(request.headers['Authorization']).toBe('Bearer test-api-key');
      expect(request.body.model).toContain(':online');
    });

    it('includes structured output schema', () => {
      const request = buildResearchRequest(
        'test-api-key',
        'Research this book',
        'google/gemini-2.5-flash-preview-05-20'
      );

      expect(request.body.response_format).toBeDefined();
      expect(request.body.response_format.type).toBe('json_schema');
      expect(request.body.response_format.json_schema.schema).toEqual(RESEARCH_SCHEMA);
    });

    it('sets appropriate max_tokens for research', () => {
      const request = buildResearchRequest(
        'test-api-key',
        'Research this book',
        'google/gemini-2.5-flash-preview-05-20'
      );

      expect(request.body.max_tokens).toBeGreaterThanOrEqual(2000);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/llm.test.ts
```

Expected: FAIL with "buildResearchRequest is not exported"

**Step 3: Add research API functions to lib/llm.ts**

Add these exports to `lib/llm.ts`:

```typescript
import { RESEARCH_SCHEMA, type ResearchResponse } from './companionResearch';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Build the request object for companion research with online model
 */
export function buildResearchRequest(
  apiKey: string,
  prompt: string,
  baseModel: string
) {
  // Append :online suffix for web-access models
  const onlineModel = baseModel.includes(':online') ? baseModel : `${baseModel}:online`;

  return {
    url: OPENROUTER_API,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://blahread.app',
      'X-Title': 'Blah Read',
    },
    body: {
      model: onlineModel,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'companion_research',
          strict: true,
          schema: RESEARCH_SCHEMA,
        },
      },
    },
  };
}

/**
 * Execute companion research via OpenRouter online model
 */
export async function executeCompanionResearch(
  apiKey: string,
  prompt: string,
  model: string
): Promise<ResearchResponse> {
  const request = buildResearchRequest(apiKey, prompt, model);

  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Research API failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in research response');
  }

  return JSON.parse(content) as ResearchResponse;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/llm.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/llm.ts __tests__/lib/llm.test.ts
git commit -m "feat(llm): add online model research API

- buildResearchRequest() with :online suffix for web access
- executeCompanionResearch() with structured output schema
- Uses OpenRouter's json_schema response format"
```

---

## Task 4: Create Inspired Companion Fallback Generator

**Files:**
- Create: `lib/inspiredCompanions.ts`
- Create: `__tests__/lib/inspiredCompanions.test.ts`

**Step 1: Write the test file**

```typescript
import { generateInspiredCompanions } from '../lib/inspiredCompanions';

describe('inspiredCompanions', () => {
  describe('generateInspiredCompanions', () => {
    it('generates companions from synopsis', () => {
      const result = generateInspiredCompanions(
        'book-123',
        'A young wizard discovers he has magical powers and must defeat an evil sorcerer.',
        5
      );

      expect(result).toHaveLength(5);
      expect(result[0].source).toBe('inspired');
      expect(result[0].bookId).toBe('book-123');
    });

    it('generates requested count', () => {
      const result = generateInspiredCompanions(
        'book-123',
        'A story about adventure.',
        10
      );

      expect(result).toHaveLength(10);
    });

    it('assigns appropriate rarity distribution', () => {
      const result = generateInspiredCompanions('book-123', 'A fantasy tale.', 15);

      const legendaries = result.filter(c => c.rarity === 'legendary');
      const rares = result.filter(c => c.rarity === 'rare');
      const commons = result.filter(c => c.rarity === 'common');

      expect(legendaries.length).toBeGreaterThanOrEqual(1);
      expect(legendaries.length).toBeLessThanOrEqual(3);
      expect(rares.length).toBeGreaterThanOrEqual(1);
      expect(commons.length).toBeGreaterThanOrEqual(1);
    });

    it('handles empty synopsis', () => {
      const result = generateInspiredCompanions('book-123', '', 5);

      expect(result).toHaveLength(5);
      // Should use generic fantasy companions
      expect(result[0].name).toBeDefined();
    });

    it('handles null synopsis', () => {
      const result = generateInspiredCompanions('book-123', null as any, 5);

      expect(result).toHaveLength(5);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/inspiredCompanions.test.ts
```

Expected: FAIL with "Cannot find module '../lib/inspiredCompanions'"

**Step 3: Write the implementation**

Create `lib/inspiredCompanions.ts`:

```typescript
import type { Companion, CompanionRarity, CompanionType } from './types';

/**
 * Thematic companion templates for when research fails
 */
const INSPIRED_TEMPLATES: Array<{
  name: string;
  type: CompanionType;
  description: string;
  traits: string;
  visualDescription: string;
  keywords: string[]; // Match against synopsis
}> = [
  // Characters
  {
    name: 'The Wanderer',
    type: 'character',
    description: 'A mysterious traveler seeking purpose',
    traits: 'Curious, resilient, introspective',
    visualDescription: 'Cloaked figure with a walking staff, weathered boots, determined eyes',
    keywords: ['journey', 'travel', 'adventure', 'quest', 'road'],
  },
  {
    name: 'The Scholar',
    type: 'character',
    description: 'A seeker of forbidden knowledge',
    traits: 'Intelligent, obsessive, cautious',
    visualDescription: 'Robed figure with spectacles, carrying ancient tomes, ink-stained fingers',
    keywords: ['book', 'learn', 'study', 'knowledge', 'wisdom', 'library'],
  },
  {
    name: 'The Guardian',
    type: 'character',
    description: 'A protector sworn to duty',
    traits: 'Loyal, brave, stoic',
    visualDescription: 'Armored warrior with a shield, stern expression, battle scars',
    keywords: ['protect', 'guard', 'defend', 'knight', 'warrior', 'soldier'],
  },
  {
    name: 'The Trickster',
    type: 'character',
    description: 'A clever rogue who thrives on chaos',
    traits: 'Witty, unpredictable, charming',
    visualDescription: 'Grinning figure in motley, quick hands, mischievous eyes',
    keywords: ['trick', 'clever', 'thief', 'cunning', 'scheme'],
  },
  {
    name: 'The Healer',
    type: 'character',
    description: 'One who mends both body and spirit',
    traits: 'Compassionate, patient, wise',
    visualDescription: 'Gentle figure with healing herbs, soft glow, caring hands',
    keywords: ['heal', 'cure', 'help', 'medicine', 'care'],
  },
  {
    name: 'The Outcast',
    type: 'character',
    description: 'Rejected by society, forging their own path',
    traits: 'Independent, bitter, resourceful',
    visualDescription: 'Hooded loner with patched clothes, wary stance, hidden depths',
    keywords: ['alone', 'exile', 'outcast', 'reject', 'different'],
  },
  {
    name: 'The Mentor',
    type: 'character',
    description: 'A wise guide with secrets of their own',
    traits: 'Patient, mysterious, knowing',
    visualDescription: 'Elder figure with kind eyes, grey beard, weathered hands',
    keywords: ['teach', 'guide', 'mentor', 'master', 'old', 'wise'],
  },
  // Creatures
  {
    name: 'Shadow Sprite',
    type: 'creature',
    description: 'A playful spirit born of darkness',
    traits: 'Mischievous, elusive, curious',
    visualDescription: 'Small dark wisp with glowing eyes, trailing shadows, impish grin',
    keywords: ['dark', 'shadow', 'night', 'spirit', 'ghost'],
  },
  {
    name: 'Flame Wisp',
    type: 'creature',
    description: 'A dancing ember with a warm heart',
    traits: 'Energetic, warm, protective',
    visualDescription: 'Flickering flame creature, orange and gold, crackling with sparks',
    keywords: ['fire', 'flame', 'burn', 'heat', 'warm'],
  },
  {
    name: 'Forest Guardian',
    type: 'creature',
    description: 'An ancient spirit of the woods',
    traits: 'Patient, territorial, nurturing',
    visualDescription: 'Tree-like creature with moss fur, leaf crown, glowing sap eyes',
    keywords: ['forest', 'tree', 'wood', 'nature', 'plant', 'green'],
  },
  {
    name: 'Storm Hawk',
    type: 'creature',
    description: 'A fierce bird crackling with lightning',
    traits: 'Swift, fierce, free',
    visualDescription: 'Electric blue bird with sparking feathers, sharp beak, piercing gaze',
    keywords: ['storm', 'lightning', 'thunder', 'sky', 'fly', 'bird'],
  },
  {
    name: 'Deep Dweller',
    type: 'creature',
    description: 'A mysterious being from the depths',
    traits: 'Ancient, unknowable, patient',
    visualDescription: 'Tentacled creature with bioluminescent spots, multiple eyes, fluid movement',
    keywords: ['sea', 'ocean', 'water', 'deep', 'swim', 'fish'],
  },
  // Objects
  {
    name: 'The Lost Key',
    type: 'object',
    description: 'Opens doors that should stay closed',
    traits: 'Mysterious, sought-after, dangerous',
    visualDescription: 'Ornate golden key with glowing runes, intricate teeth, warm to touch',
    keywords: ['key', 'lock', 'door', 'secret', 'hidden', 'open'],
  },
  {
    name: 'Seeker\'s Compass',
    type: 'object',
    description: 'Points toward what you truly desire',
    traits: 'Unreliable, insightful, ancient',
    visualDescription: 'Brass compass with spinning needle, cracked glass, strange symbols',
    keywords: ['find', 'search', 'lost', 'direction', 'map', 'compass'],
  },
  {
    name: 'Memory Stone',
    type: 'object',
    description: 'Holds echoes of the past',
    traits: 'Melancholic, valuable, fragile',
    visualDescription: 'Smooth crystal that swirls with images, cool to touch, faintly humming',
    keywords: ['remember', 'memory', 'past', 'history', 'forget'],
  },
  {
    name: 'Binding Tome',
    type: 'object',
    description: 'A book of power best left unread',
    traits: 'Dangerous, tempting, powerful',
    visualDescription: 'Leather-bound book with chains, glowing text, whispering pages',
    keywords: ['book', 'magic', 'spell', 'power', 'forbidden'],
  },
  {
    name: 'Warrior\'s Blade',
    type: 'object',
    description: 'A weapon with a storied past',
    traits: 'Loyal, hungry, legendary',
    visualDescription: 'Gleaming sword with notched edge, wrapped hilt, faint glow',
    keywords: ['sword', 'weapon', 'fight', 'battle', 'war', 'blade'],
  },
];

/**
 * Score how well a template matches the synopsis
 */
function scoreTemplate(
  template: (typeof INSPIRED_TEMPLATES)[0],
  synopsisLower: string
): number {
  return template.keywords.reduce((score, keyword) => {
    return score + (synopsisLower.includes(keyword) ? 1 : 0);
  }, 0);
}

/**
 * Generate inspired companions based on synopsis themes when research fails
 */
export function generateInspiredCompanions(
  bookId: string,
  synopsis: string | null,
  count: number
): Companion[] {
  const synopsisLower = (synopsis || '').toLowerCase();

  // Score and sort templates by relevance
  const scored = INSPIRED_TEMPLATES.map(template => ({
    template,
    score: scoreTemplate(template, synopsisLower),
  })).sort((a, b) => b.score - a.score);

  // Take top matches, pad with remaining if needed
  const selected = scored.slice(0, count).map(s => s.template);

  // Assign rarities: ~3 legendary, ~4 rare, rest common for 15 companions
  const legendaryCount = Math.min(3, Math.ceil(count * 0.2));
  const rareCount = Math.min(4, Math.ceil(count * 0.27));

  return selected.map((template, index): Companion => {
    let rarity: CompanionRarity;
    if (index < legendaryCount) {
      rarity = 'legendary';
    } else if (index < legendaryCount + rareCount) {
      rarity = 'rare';
    } else {
      rarity = 'common';
    }

    return {
      id: `${bookId}-inspired-${index}-${Date.now()}`,
      bookId,
      name: template.name,
      type: template.type,
      rarity,
      description: template.description,
      traits: template.traits,
      visualDescription: template.visualDescription,
      imageUrl: null,
      source: 'inspired',
      unlockMethod: null,
      unlockedAt: null,
    };
  });
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/inspiredCompanions.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/inspiredCompanions.ts __tests__/lib/inspiredCompanions.test.ts
git commit -m "feat(companions): add inspired companion fallback generator

- Thematic templates matching synopsis keywords
- Used when LLM research yields limited results
- Maintains rarity distribution (legendary/rare/common)"
```

---

## Task 5: Create Main Companion Research Orchestrator

**Files:**
- Create: `lib/companionOrchestrator.ts`
- Create: `__tests__/lib/companionOrchestrator.test.ts`

**Step 1: Write the test file**

```typescript
import { orchestrateCompanionResearch } from '../lib/companionOrchestrator';

// Mock the dependencies
jest.mock('../lib/llm', () => ({
  executeCompanionResearch: jest.fn(),
}));

jest.mock('../lib/settings', () => ({
  getSettings: jest.fn().mockResolvedValue({
    apiKey: 'test-key',
    llmModel: 'google/gemini-2.5-flash-preview-05-20',
  }),
}));

import { executeCompanionResearch } from '../lib/llm';

describe('companionOrchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('orchestrateCompanionResearch', () => {
    it('returns BookCompanions structure on successful research', async () => {
      (executeCompanionResearch as jest.Mock).mockResolvedValue({
        companions: [
          {
            name: 'Hero',
            type: 'character',
            rarity: 'legendary',
            description: 'The main character',
            role: 'Protagonist',
            traits: 'Brave',
            visualDescription: 'Tall warrior',
          },
        ],
        researchConfidence: 'high',
      });

      const result = await orchestrateCompanionResearch({
        bookId: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        synopsis: 'A test synopsis',
      });

      expect(result.researchComplete).toBe(true);
      expect(result.researchConfidence).toBe('high');
      expect(result.readingTimeQueue.companions.length).toBeGreaterThanOrEqual(0);
      expect(result.poolQueue.companions.length).toBeGreaterThanOrEqual(0);
    });

    it('falls back to inspired companions on API failure', async () => {
      (executeCompanionResearch as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await orchestrateCompanionResearch({
        bookId: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        synopsis: 'A fantasy adventure',
      });

      expect(result.researchComplete).toBe(true);
      expect(result.researchConfidence).toBe('low');
      // Should have inspired companions
      const allCompanions = [
        ...result.readingTimeQueue.companions,
        ...result.poolQueue.companions,
      ];
      expect(allCompanions.every(c => c.source === 'inspired')).toBe(true);
    });

    it('supplements with inspired companions when research returns few results', async () => {
      (executeCompanionResearch as jest.Mock).mockResolvedValue({
        companions: [
          {
            name: 'Hero',
            type: 'character',
            rarity: 'legendary',
            description: 'The only known character',
            role: 'Protagonist',
            traits: 'Brave',
            visualDescription: 'Warrior',
          },
        ],
        researchConfidence: 'medium',
      });

      const result = await orchestrateCompanionResearch({
        bookId: 'book-123',
        title: 'Obscure Book',
        author: 'Unknown Author',
        synopsis: 'A mysterious tale',
      });

      const allCompanions = [
        ...result.readingTimeQueue.companions,
        ...result.poolQueue.companions,
      ];

      // Should have padded to ~15 companions
      expect(allCompanions.length).toBeGreaterThanOrEqual(10);

      // Should have mix of discovered and inspired
      const discovered = allCompanions.filter(c => c.source === 'discovered');
      const inspired = allCompanions.filter(c => c.source === 'inspired');
      expect(discovered.length).toBe(1);
      expect(inspired.length).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/companionOrchestrator.test.ts
```

Expected: FAIL with "Cannot find module '../lib/companionOrchestrator'"

**Step 3: Write the implementation**

Create `lib/companionOrchestrator.ts`:

```typescript
import type { Book, BookCompanions, Companion } from './types';
import { getSettings } from './settings';
import { executeCompanionResearch } from './llm';
import {
  buildResearchPrompt,
  parseResearchResponse,
  assignCompanionQueues,
} from './companionResearch';
import { generateInspiredCompanions } from './inspiredCompanions';

const TARGET_COMPANION_COUNT = 15;
const MIN_DISCOVERED_FOR_HIGH_CONFIDENCE = 10;

interface ResearchInput {
  bookId: string;
  title: string;
  author?: string;
  synopsis?: string | null;
}

/**
 * Main orchestrator for companion research
 * Handles API calls, fallbacks, and queue assignment
 */
export async function orchestrateCompanionResearch(
  input: ResearchInput
): Promise<BookCompanions> {
  const settings = await getSettings();

  if (!settings.apiKey) {
    // No API key - use only inspired companions
    return createInspiredOnlyResult(input);
  }

  try {
    // Build and execute research
    const prompt = buildResearchPrompt(input.title, input.author);
    const response = await executeCompanionResearch(
      settings.apiKey,
      prompt,
      settings.llmModel
    );

    // Parse response
    const parsed = parseResearchResponse(response, input.bookId);

    // Determine if we need to supplement with inspired companions
    let allCompanions = parsed.companions;
    let confidence = parsed.confidence;

    if (allCompanions.length < TARGET_COMPANION_COUNT) {
      // Supplement with inspired companions
      const needed = TARGET_COMPANION_COUNT - allCompanions.length;
      const inspired = generateInspiredCompanions(
        input.bookId,
        input.synopsis || null,
        needed
      );
      allCompanions = [...allCompanions, ...inspired];

      // Downgrade confidence if we had to supplement a lot
      if (parsed.companions.length < MIN_DISCOVERED_FOR_HIGH_CONFIDENCE) {
        confidence = parsed.companions.length < 5 ? 'low' : 'medium';
      }
    }

    // Assign to queues
    const { readingTimeQueue, poolQueue, completionLegendary } =
      assignCompanionQueues(allCompanions);

    // If we have a completion legendary, ensure it's tracked separately
    // For now, it goes in the pool queue and gets pulled on book completion
    if (completionLegendary && !poolQueue.companions.includes(completionLegendary)) {
      poolQueue.companions.push(completionLegendary);
    }

    return {
      researchComplete: true,
      researchConfidence: confidence,
      readingTimeQueue,
      poolQueue,
      unlockedCompanions: [],
    };
  } catch (error) {
    console.error('Companion research failed:', error);
    return createInspiredOnlyResult(input);
  }
}

/**
 * Create result using only inspired companions (fallback)
 */
function createInspiredOnlyResult(input: ResearchInput): BookCompanions {
  const inspired = generateInspiredCompanions(
    input.bookId,
    input.synopsis || null,
    TARGET_COMPANION_COUNT
  );

  const { readingTimeQueue, poolQueue } = assignCompanionQueues(inspired);

  return {
    researchComplete: true,
    researchConfidence: 'low',
    readingTimeQueue,
    poolQueue,
    unlockedCompanions: [],
  };
}

/**
 * Check if companion research should run for a book
 */
export function shouldRunCompanionResearch(book: Book): boolean {
  // Don't re-research if already complete
  if (book.companions?.researchComplete) {
    return false;
  }

  // Need at least a title
  if (!book.title) {
    return false;
  }

  return true;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/companionOrchestrator.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/companionOrchestrator.ts __tests__/lib/companionOrchestrator.test.ts
git commit -m "feat(companions): add research orchestrator

- orchestrateCompanionResearch() coordinates full flow
- Falls back to inspired companions on API failure
- Supplements research with inspired when results are sparse
- shouldRunCompanionResearch() prevents duplicate research"
```

---

## Task 6: Create Reading Time Unlock Logic

**Files:**
- Create: `lib/companionUnlock.ts`
- Create: `__tests__/lib/companionUnlock.test.ts`

**Step 1: Write the test file**

```typescript
import {
  READING_TIME_MILESTONES,
  checkReadingTimeUnlocks,
  getNextMilestone,
} from '../lib/companionUnlock';

describe('companionUnlock', () => {
  describe('READING_TIME_MILESTONES', () => {
    it('starts at 30 minutes', () => {
      expect(READING_TIME_MILESTONES[0]).toBe(30 * 60); // 30 min in seconds
    });

    it('has 7 milestones', () => {
      expect(READING_TIME_MILESTONES).toHaveLength(7);
    });

    it('milestones are in ascending order', () => {
      for (let i = 1; i < READING_TIME_MILESTONES.length; i++) {
        expect(READING_TIME_MILESTONES[i]).toBeGreaterThan(READING_TIME_MILESTONES[i - 1]);
      }
    });
  });

  describe('checkReadingTimeUnlocks', () => {
    it('returns empty array when no milestones crossed', () => {
      const result = checkReadingTimeUnlocks(0, 15 * 60); // 0 to 15 min
      expect(result).toEqual([]);
    });

    it('returns milestone index when first milestone crossed', () => {
      const result = checkReadingTimeUnlocks(0, 35 * 60); // 0 to 35 min
      expect(result).toContain(0); // First milestone (30 min)
    });

    it('returns multiple indices when multiple milestones crossed', () => {
      const result = checkReadingTimeUnlocks(0, 3 * 60 * 60); // 0 to 3 hours
      expect(result).toContain(0); // 30 min
      expect(result).toContain(1); // 1 hour
      expect(result).toContain(2); // 2 hours
    });

    it('does not return already-passed milestones', () => {
      const result = checkReadingTimeUnlocks(2 * 60 * 60, 4 * 60 * 60); // 2hr to 4hr
      expect(result).not.toContain(0); // 30 min already passed
      expect(result).not.toContain(1); // 1 hour already passed
      expect(result).toContain(3); // 3.5 hours
    });
  });

  describe('getNextMilestone', () => {
    it('returns first milestone when no time read', () => {
      const result = getNextMilestone(0);
      expect(result).toEqual({
        index: 0,
        timeSeconds: 30 * 60,
        timeRemaining: 30 * 60,
      });
    });

    it('returns next milestone based on current time', () => {
      const result = getNextMilestone(45 * 60); // 45 min read
      expect(result?.index).toBe(1); // Next is 1 hour
      expect(result?.timeRemaining).toBe(15 * 60); // 15 min to go
    });

    it('returns null when all milestones passed', () => {
      const result = getNextMilestone(15 * 60 * 60); // 15 hours
      expect(result).toBeNull();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/companionUnlock.test.ts
```

Expected: FAIL with "Cannot find module '../lib/companionUnlock'"

**Step 3: Write the implementation**

Create `lib/companionUnlock.ts`:

```typescript
import type { Book, BookCompanions, Companion, LootBox } from './types';

/**
 * Reading time milestones in seconds (front-loaded)
 * 30min, 1hr, 2hr, 3.5hr, 5hr, 7hr, 10hr
 */
export const READING_TIME_MILESTONES = [
  30 * 60,      // 30 minutes
  60 * 60,      // 1 hour
  2 * 60 * 60,  // 2 hours
  3.5 * 60 * 60, // 3.5 hours
  5 * 60 * 60,  // 5 hours (legendary milestone)
  7 * 60 * 60,  // 7 hours
  10 * 60 * 60, // 10 hours
];

/**
 * After exhausting reading-time queue, earn 1 loot box per additional hour
 */
export const LOOT_BOX_INTERVAL_SECONDS = 60 * 60; // 1 hour

/**
 * Check which milestone indices were crossed between previous and new reading time
 */
export function checkReadingTimeUnlocks(
  previousTimeSeconds: number,
  newTimeSeconds: number
): number[] {
  const crossed: number[] = [];

  for (let i = 0; i < READING_TIME_MILESTONES.length; i++) {
    const milestone = READING_TIME_MILESTONES[i];
    if (previousTimeSeconds < milestone && newTimeSeconds >= milestone) {
      crossed.push(i);
    }
  }

  return crossed;
}

/**
 * Get information about the next milestone
 */
export function getNextMilestone(
  currentTimeSeconds: number
): { index: number; timeSeconds: number; timeRemaining: number } | null {
  for (let i = 0; i < READING_TIME_MILESTONES.length; i++) {
    const milestone = READING_TIME_MILESTONES[i];
    if (currentTimeSeconds < milestone) {
      return {
        index: i,
        timeSeconds: milestone,
        timeRemaining: milestone - currentTimeSeconds,
      };
    }
  }
  return null; // All milestones passed
}

/**
 * Check if reading past the queue should earn loot boxes
 */
export function checkPostQueueLootBoxes(
  previousTimeSeconds: number,
  newTimeSeconds: number,
  queueExhausted: boolean
): number {
  if (!queueExhausted) {
    return 0;
  }

  // Count how many hour boundaries were crossed after the last milestone
  const lastMilestone = READING_TIME_MILESTONES[READING_TIME_MILESTONES.length - 1];
  const effectivePrevious = Math.max(previousTimeSeconds, lastMilestone);
  const effectiveNew = Math.max(newTimeSeconds, lastMilestone);

  const previousHours = Math.floor(effectivePrevious / LOOT_BOX_INTERVAL_SECONDS);
  const newHours = Math.floor(effectiveNew / LOOT_BOX_INTERVAL_SECONDS);

  return Math.max(0, newHours - previousHours);
}

/**
 * Process a reading session and return any unlocked companions and earned loot boxes
 */
export function processReadingSession(
  book: Book,
  sessionDurationSeconds: number
): {
  unlockedCompanions: Companion[];
  earnedLootBoxes: LootBox[];
  updatedCompanions: BookCompanions;
} {
  if (!book.companions) {
    return {
      unlockedCompanions: [],
      earnedLootBoxes: [],
      updatedCompanions: book.companions!,
    };
  }

  const previousTime = book.totalReadingTime;
  const newTime = previousTime + sessionDurationSeconds;

  // Check for milestone unlocks
  const crossedMilestones = checkReadingTimeUnlocks(previousTime, newTime);

  // Get companions to unlock from reading-time queue
  const companions = { ...book.companions };
  const readingQueue = { ...companions.readingTimeQueue };
  const unlockedCompanions: Companion[] = [];

  for (const milestoneIndex of crossedMilestones) {
    // Unlock the next companion in the reading-time queue
    const companionIndex = readingQueue.companions.findIndex(
      c => c.unlockMethod === null
    );

    if (companionIndex !== -1) {
      const companion = { ...readingQueue.companions[companionIndex] };
      companion.unlockMethod = 'reading_time';
      companion.unlockedAt = Date.now();

      // Update the queue
      readingQueue.companions[companionIndex] = companion;
      unlockedCompanions.push(companion);

      // Add to unlocked list
      companions.unlockedCompanions = [
        ...companions.unlockedCompanions,
        companion,
      ];
    }
  }

  companions.readingTimeQueue = readingQueue;

  // Check for post-queue loot boxes
  const queueExhausted = readingQueue.companions.every(
    c => c.unlockMethod !== null
  );
  const lootBoxCount = checkPostQueueLootBoxes(
    previousTime,
    newTime,
    queueExhausted
  );

  const earnedLootBoxes: LootBox[] = [];
  for (let i = 0; i < lootBoxCount; i++) {
    earnedLootBoxes.push({
      id: `lootbox-${Date.now()}-${i}`,
      earnedAt: Date.now(),
      source: 'reading_overflow',
    });
  }

  return {
    unlockedCompanions,
    earnedLootBoxes,
    updatedCompanions: companions,
  };
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/companionUnlock.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/companionUnlock.ts __tests__/lib/companionUnlock.test.ts
git commit -m "feat(companions): add reading time unlock logic

- READING_TIME_MILESTONES: 30min, 1hr, 2hr, 3.5hr, 5hr, 7hr, 10hr
- checkReadingTimeUnlocks() detects milestone crossings
- getNextMilestone() for progress display
- checkPostQueueLootBoxes() for extended reading rewards
- processReadingSession() orchestrates unlock flow"
```

---

## Task 7: Create Loot Box System

**Files:**
- Create: `lib/lootBox.ts`
- Create: `__tests__/lib/lootBox.test.ts`

**Step 1: Write the test file**

```typescript
import {
  checkLootBoxRewards,
  openLootBox,
  getPoolCompanions,
} from '../lib/lootBox';
import type { UserProgress, Book, Companion } from '../lib/types';

describe('lootBox', () => {
  describe('checkLootBoxRewards', () => {
    const baseProgress: UserProgress = {
      totalXp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastReadDate: null,
      lootItems: [],
      lootBoxes: { availableBoxes: [], openHistory: [] },
      booksFinished: 0,
      booksAdded: 0,
      totalHoursRead: 0,
    };

    it('awards boxes for streak milestones', () => {
      const prev = { ...baseProgress, currentStreak: 2 };
      const next = { ...baseProgress, currentStreak: 3 };

      const boxes = checkLootBoxRewards(prev, next);
      expect(boxes.some(b => b.source === 'streak_3')).toBe(true);
    });

    it('awards 2 boxes for 7-day streak', () => {
      const prev = { ...baseProgress, currentStreak: 6 };
      const next = { ...baseProgress, currentStreak: 7 };

      const boxes = checkLootBoxRewards(prev, next);
      const streakBoxes = boxes.filter(b => b.source === 'streak_7');
      expect(streakBoxes.length).toBe(2);
    });

    it('awards boxes for XP milestones', () => {
      const prev = { ...baseProgress, totalXp: 200 };
      const next = { ...baseProgress, totalXp: 300 };

      const boxes = checkLootBoxRewards(prev, next);
      expect(boxes.some(b => b.source === 'xp_250')).toBe(true);
    });

    it('awards boxes for finishing books', () => {
      const prev = { ...baseProgress, booksFinished: 0 };
      const next = { ...baseProgress, booksFinished: 1 };

      const boxes = checkLootBoxRewards(prev, next);
      const finishBoxes = boxes.filter(b => b.source === 'book_finished');
      expect(finishBoxes.length).toBe(2);
    });

    it('awards boxes for book count milestones', () => {
      const prev = { ...baseProgress, booksAdded: 2 };
      const next = { ...baseProgress, booksAdded: 3 };

      const boxes = checkLootBoxRewards(prev, next);
      expect(boxes.some(b => b.source === 'books_added_3')).toBe(true);
    });
  });

  describe('openLootBox', () => {
    const mockCompanion: Companion = {
      id: 'comp-1',
      bookId: 'book-1',
      name: 'Test Companion',
      type: 'character',
      rarity: 'common',
      description: 'A test',
      traits: 'Testy',
      visualDescription: 'A pixel character',
      imageUrl: 'http://example.com/image.png',
      source: 'discovered',
      unlockMethod: null,
      unlockedAt: null,
    };

    it('returns a companion from the pool', () => {
      const pool = [mockCompanion];
      const result = openLootBox(pool, null);

      expect(result.companion).toBeDefined();
      expect(result.companion?.unlockMethod).toBe('loot_box');
      expect(result.companion?.unlockedAt).toBeDefined();
    });

    it('weights toward current book companions', () => {
      const currentBookCompanion = { ...mockCompanion, bookId: 'current-book' };
      const otherBookCompanion = { ...mockCompanion, id: 'comp-2', bookId: 'other-book' };
      const pool = [otherBookCompanion, currentBookCompanion];

      // Run multiple times to check weighting
      let currentBookWins = 0;
      for (let i = 0; i < 100; i++) {
        const result = openLootBox(pool, 'current-book');
        if (result.companion?.bookId === 'current-book') {
          currentBookWins++;
        }
      }

      // Current book should win more often due to weighting
      expect(currentBookWins).toBeGreaterThan(60);
    });

    it('returns null when pool is empty', () => {
      const result = openLootBox([], null);
      expect(result.companion).toBeNull();
    });
  });

  describe('getPoolCompanions', () => {
    it('collects unlockable companions from all books', () => {
      const books: Book[] = [
        {
          id: 'book-1',
          title: 'Book 1',
          coverUrl: null,
          synopsis: null,
          sourceUrl: null,
          status: 'reading',
          totalReadingTime: 0,
          createdAt: Date.now(),
          companions: {
            researchComplete: true,
            researchConfidence: 'high',
            readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
            poolQueue: {
              companions: [
                {
                  id: 'comp-1',
                  bookId: 'book-1',
                  name: 'Pool Companion',
                  type: 'character',
                  rarity: 'common',
                  description: '',
                  traits: '',
                  visualDescription: '',
                  imageUrl: 'http://example.com/image.png',
                  source: 'discovered',
                  unlockMethod: null,
                  unlockedAt: null,
                },
              ],
              nextGenerateIndex: 1,
            },
            unlockedCompanions: [],
          },
        },
      ];

      const pool = getPoolCompanions(books);
      expect(pool).toHaveLength(1);
      expect(pool[0].imageUrl).toBeDefined(); // Has generated image
    });

    it('excludes companions without generated images', () => {
      const books: Book[] = [
        {
          id: 'book-1',
          title: 'Book 1',
          coverUrl: null,
          synopsis: null,
          sourceUrl: null,
          status: 'reading',
          totalReadingTime: 0,
          createdAt: Date.now(),
          companions: {
            researchComplete: true,
            researchConfidence: 'high',
            readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
            poolQueue: {
              companions: [
                {
                  id: 'comp-1',
                  bookId: 'book-1',
                  name: 'No Image',
                  type: 'character',
                  rarity: 'common',
                  description: '',
                  traits: '',
                  visualDescription: '',
                  imageUrl: null, // No image yet
                  source: 'discovered',
                  unlockMethod: null,
                  unlockedAt: null,
                },
              ],
              nextGenerateIndex: 0,
            },
            unlockedCompanions: [],
          },
        },
      ];

      const pool = getPoolCompanions(books);
      expect(pool).toHaveLength(0);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/lootBox.test.ts
```

Expected: FAIL with "Cannot find module '../lib/lootBox'"

**Step 3: Write the implementation**

Create `lib/lootBox.ts`:

```typescript
import type { Book, Companion, LootBox, UserProgress } from './types';

/**
 * Loot box reward thresholds
 */
const STREAK_REWARDS: Record<number, number> = {
  3: 1,   // 3-day streak = 1 box
  7: 2,   // 7-day streak = 2 boxes
  14: 3,  // 14-day streak = 3 boxes
  30: 5,  // 30-day streak = 5 boxes
};

const XP_INTERVAL = 250; // 1 box per 250 XP

const BOOK_COUNT_MILESTONES = [3, 5, 10, 15, 20]; // 1 box each

const HOURS_READ_MILESTONES = [5, 10, 25, 50, 100]; // 1 box each

const BOOKS_FINISHED_REWARD = 2; // 2 boxes per book finished

/**
 * Weight multiplier for current book companions in loot pool
 */
const CURRENT_BOOK_WEIGHT = 3;

/**
 * Check what loot box rewards should be given based on progress changes
 */
export function checkLootBoxRewards(
  previousProgress: UserProgress,
  newProgress: UserProgress
): LootBox[] {
  const boxes: LootBox[] = [];
  const now = Date.now();

  // Check streak milestones
  for (const [milestone, reward] of Object.entries(STREAK_REWARDS)) {
    const milestoneNum = parseInt(milestone);
    if (
      previousProgress.currentStreak < milestoneNum &&
      newProgress.currentStreak >= milestoneNum
    ) {
      for (let i = 0; i < reward; i++) {
        boxes.push({
          id: `lootbox-streak-${milestone}-${now}-${i}`,
          earnedAt: now,
          source: `streak_${milestone}`,
        });
      }
    }
  }

  // Check XP milestones
  const previousXpMilestone = Math.floor(previousProgress.totalXp / XP_INTERVAL);
  const newXpMilestone = Math.floor(newProgress.totalXp / XP_INTERVAL);
  for (let m = previousXpMilestone + 1; m <= newXpMilestone; m++) {
    boxes.push({
      id: `lootbox-xp-${m * XP_INTERVAL}-${now}`,
      earnedAt: now,
      source: `xp_${m * XP_INTERVAL}`,
    });
  }

  // Check books finished
  if (newProgress.booksFinished > previousProgress.booksFinished) {
    const booksJustFinished = newProgress.booksFinished - previousProgress.booksFinished;
    for (let i = 0; i < booksJustFinished * BOOKS_FINISHED_REWARD; i++) {
      boxes.push({
        id: `lootbox-finished-${now}-${i}`,
        earnedAt: now,
        source: 'book_finished',
      });
    }
  }

  // Check books added milestones
  for (const milestone of BOOK_COUNT_MILESTONES) {
    if (
      previousProgress.booksAdded < milestone &&
      newProgress.booksAdded >= milestone
    ) {
      boxes.push({
        id: `lootbox-books-${milestone}-${now}`,
        earnedAt: now,
        source: `books_added_${milestone}`,
      });
    }
  }

  // Check hours read milestones
  for (const milestone of HOURS_READ_MILESTONES) {
    if (
      previousProgress.totalHoursRead < milestone &&
      newProgress.totalHoursRead >= milestone
    ) {
      boxes.push({
        id: `lootbox-hours-${milestone}-${now}`,
        earnedAt: now,
        source: `hours_read_${milestone}`,
      });
    }
  }

  return boxes;
}

/**
 * Get all pool companions that are available for loot box pulls
 * (have generated images and haven't been unlocked)
 */
export function getPoolCompanions(books: Book[]): Companion[] {
  const pool: Companion[] = [];

  for (const book of books) {
    if (!book.companions) continue;

    for (const companion of book.companions.poolQueue.companions) {
      // Only include if:
      // - Has a generated image
      // - Hasn't been unlocked yet
      if (companion.imageUrl && companion.unlockMethod === null) {
        pool.push(companion);
      }
    }
  }

  return pool;
}

/**
 * Open a loot box and get a random companion from the pool
 * Weighted toward companions from the current book
 */
export function openLootBox(
  pool: Companion[],
  currentBookId: string | null
): { companion: Companion | null } {
  if (pool.length === 0) {
    return { companion: null };
  }

  // Build weighted pool
  const weightedPool: Companion[] = [];
  for (const companion of pool) {
    const weight =
      currentBookId && companion.bookId === currentBookId
        ? CURRENT_BOOK_WEIGHT
        : 1;
    for (let i = 0; i < weight; i++) {
      weightedPool.push(companion);
    }
  }

  // Random selection
  const index = Math.floor(Math.random() * weightedPool.length);
  const selected = weightedPool[index];

  // Mark as unlocked
  const unlocked: Companion = {
    ...selected,
    unlockMethod: 'loot_box',
    unlockedAt: Date.now(),
  };

  return { companion: unlocked };
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/lootBox.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/lootBox.ts __tests__/lib/lootBox.test.ts
git commit -m "feat(lootbox): add loot box reward system

- checkLootBoxRewards() for streak/XP/achievement rewards
- getPoolCompanions() collects available companions
- openLootBox() with weighted random selection
- Current book companions 3x more likely in pulls"
```

---

## Task 8: Create Companion Image Generation Queue

**Files:**
- Create: `lib/companionImageQueue.ts`
- Create: `__tests__/lib/companionImageQueue.test.ts`

**Step 1: Write the test file**

```typescript
import {
  getCompanionsNeedingImages,
  shouldGenerateMoreImages,
  READING_TIME_BUFFER,
  POOL_BUFFER,
} from '../lib/companionImageQueue';
import type { BookCompanions, Companion } from '../lib/types';

const createCompanion = (
  id: string,
  imageUrl: string | null
): Companion => ({
  id,
  bookId: 'book-1',
  name: `Companion ${id}`,
  type: 'character',
  rarity: 'common',
  description: '',
  traits: '',
  visualDescription: 'A pixel character',
  imageUrl,
  source: 'discovered',
  unlockMethod: null,
  unlockedAt: null,
});

describe('companionImageQueue', () => {
  describe('getCompanionsNeedingImages', () => {
    it('returns companions without images up to buffer limit', () => {
      const companions: BookCompanions = {
        researchComplete: true,
        researchConfidence: 'high',
        readingTimeQueue: {
          companions: [
            createCompanion('1', null),
            createCompanion('2', null),
            createCompanion('3', null),
          ],
          nextGenerateIndex: 0,
        },
        poolQueue: {
          companions: [
            createCompanion('4', null),
            createCompanion('5', null),
            createCompanion('6', null),
            createCompanion('7', null),
          ],
          nextGenerateIndex: 0,
        },
        unlockedCompanions: [],
      };

      const result = getCompanionsNeedingImages(companions);

      // Should get READING_TIME_BUFFER from reading queue
      expect(result.readingTime.length).toBe(READING_TIME_BUFFER);
      // Should get POOL_BUFFER from pool queue
      expect(result.pool.length).toBe(POOL_BUFFER);
    });

    it('skips companions that already have images', () => {
      const companions: BookCompanions = {
        researchComplete: true,
        researchConfidence: 'high',
        readingTimeQueue: {
          companions: [
            createCompanion('1', 'http://example.com/1.png'),
            createCompanion('2', null),
          ],
          nextGenerateIndex: 1,
        },
        poolQueue: {
          companions: [],
          nextGenerateIndex: 0,
        },
        unlockedCompanions: [],
      };

      const result = getCompanionsNeedingImages(companions);
      expect(result.readingTime.length).toBe(1);
      expect(result.readingTime[0].id).toBe('2');
    });
  });

  describe('shouldGenerateMoreImages', () => {
    it('returns true when buffer is depleted', () => {
      const companions: BookCompanions = {
        researchComplete: true,
        researchConfidence: 'high',
        readingTimeQueue: {
          companions: [
            createCompanion('1', null),
            createCompanion('2', null),
          ],
          nextGenerateIndex: 0,
        },
        poolQueue: {
          companions: [
            createCompanion('3', null),
          ],
          nextGenerateIndex: 0,
        },
        unlockedCompanions: [],
      };

      expect(shouldGenerateMoreImages(companions)).toBe(true);
    });

    it('returns false when buffers are full', () => {
      const companions: BookCompanions = {
        researchComplete: true,
        researchConfidence: 'high',
        readingTimeQueue: {
          companions: [
            createCompanion('1', 'http://example.com/1.png'),
            createCompanion('2', 'http://example.com/2.png'),
          ],
          nextGenerateIndex: 2,
        },
        poolQueue: {
          companions: [
            createCompanion('3', 'http://example.com/3.png'),
            createCompanion('4', 'http://example.com/4.png'),
            createCompanion('5', 'http://example.com/5.png'),
          ],
          nextGenerateIndex: 3,
        },
        unlockedCompanions: [],
      };

      expect(shouldGenerateMoreImages(companions)).toBe(false);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/companionImageQueue.test.ts
```

Expected: FAIL with "Cannot find module '../lib/companionImageQueue'"

**Step 3: Write the implementation**

Create `lib/companionImageQueue.ts`:

```typescript
import type { Book, BookCompanions, Companion } from './types';
import { generateCompanionImage } from './imageGen';
import { getSettings } from './settings';

/**
 * Buffer sizes for pre-generated images
 */
export const READING_TIME_BUFFER = 2;
export const POOL_BUFFER = 3;

/**
 * Get companions that need image generation to maintain buffers
 */
export function getCompanionsNeedingImages(companions: BookCompanions): {
  readingTime: Companion[];
  pool: Companion[];
} {
  const readingTime: Companion[] = [];
  const pool: Companion[] = [];

  // Check reading time queue
  let readingTimeWithImages = 0;
  for (const companion of companions.readingTimeQueue.companions) {
    if (companion.imageUrl) {
      readingTimeWithImages++;
    } else if (readingTimeWithImages < READING_TIME_BUFFER && readingTime.length < READING_TIME_BUFFER) {
      readingTime.push(companion);
    }
  }

  // Check pool queue
  let poolWithImages = 0;
  for (const companion of companions.poolQueue.companions) {
    if (companion.imageUrl) {
      poolWithImages++;
    } else if (poolWithImages < POOL_BUFFER && pool.length < POOL_BUFFER) {
      pool.push(companion);
    }
  }

  return { readingTime, pool };
}

/**
 * Check if more images should be generated for a book
 */
export function shouldGenerateMoreImages(companions: BookCompanions): boolean {
  const needed = getCompanionsNeedingImages(companions);
  return needed.readingTime.length > 0 || needed.pool.length > 0;
}

/**
 * Generate images for companions that need them
 * Returns updated companions with image URLs
 */
export async function generateBufferedImages(
  companions: BookCompanions,
  onProgress?: (completed: number, total: number) => void
): Promise<BookCompanions> {
  const settings = await getSettings();

  if (!settings.apiKey) {
    return companions;
  }

  const needed = getCompanionsNeedingImages(companions);
  const allNeeded = [...needed.readingTime, ...needed.pool];

  if (allNeeded.length === 0) {
    return companions;
  }

  const updated = { ...companions };
  updated.readingTimeQueue = { ...updated.readingTimeQueue };
  updated.poolQueue = { ...updated.poolQueue };
  updated.readingTimeQueue.companions = [...updated.readingTimeQueue.companions];
  updated.poolQueue.companions = [...updated.poolQueue.companions];

  let completed = 0;

  for (const companion of allNeeded) {
    try {
      const imageUrl = await generateCompanionImage(
        settings.apiKey,
        settings.imageModel,
        companion.visualDescription,
        companion.name
      );

      // Find and update the companion in the appropriate queue
      const readingIndex = updated.readingTimeQueue.companions.findIndex(
        c => c.id === companion.id
      );
      if (readingIndex !== -1) {
        updated.readingTimeQueue.companions[readingIndex] = {
          ...updated.readingTimeQueue.companions[readingIndex],
          imageUrl,
        };
        updated.readingTimeQueue.nextGenerateIndex = Math.max(
          updated.readingTimeQueue.nextGenerateIndex,
          readingIndex + 1
        );
      }

      const poolIndex = updated.poolQueue.companions.findIndex(
        c => c.id === companion.id
      );
      if (poolIndex !== -1) {
        updated.poolQueue.companions[poolIndex] = {
          ...updated.poolQueue.companions[poolIndex],
          imageUrl,
        };
        updated.poolQueue.nextGenerateIndex = Math.max(
          updated.poolQueue.nextGenerateIndex,
          poolIndex + 1
        );
      }

      completed++;
      onProgress?.(completed, allNeeded.length);
    } catch (error) {
      console.error(`Failed to generate image for ${companion.name}:`, error);
      // Continue with other companions
    }
  }

  return updated;
}

/**
 * Trigger background image generation for a book if needed
 */
export async function maybeGenerateImages(book: Book): Promise<Book> {
  if (!book.companions || !shouldGenerateMoreImages(book.companions)) {
    return book;
  }

  const updatedCompanions = await generateBufferedImages(book.companions);

  return {
    ...book,
    companions: updatedCompanions,
  };
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/companionImageQueue.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/companionImageQueue.ts __tests__/lib/companionImageQueue.test.ts
git commit -m "feat(images): add companion image generation queue

- READING_TIME_BUFFER (2) and POOL_BUFFER (3) constants
- getCompanionsNeedingImages() identifies generation needs
- shouldGenerateMoreImages() checks buffer status
- generateBufferedImages() processes queue with progress
- maybeGenerateImages() triggers background generation"
```

---

## Task 9: Integrate Research into Book Add Flow

**Files:**
- Modify: `lib/kindleShareProcessor.ts`
- Modify: `app/manual-entry.tsx` (if exists)

**Step 1: Read current kindleShareProcessor to understand flow**

Read the file first to understand the current structure.

**Step 2: Add research step to Kindle share flow**

After book is created and enriched, add companion research:

```typescript
import { orchestrateCompanionResearch, shouldRunCompanionResearch } from './companionOrchestrator';
import { generateBufferedImages } from './companionImageQueue';

// In the processKindleShare function, after enrichment:

// Step: Research companions
if (shouldRunCompanionResearch(book)) {
  onProgress?.({ step: 'researching', message: 'Discovering companions...' });

  const companions = await orchestrateCompanionResearch({
    bookId: book.id,
    title: book.title,
    author: book.authors?.[0],
    synopsis: book.synopsis,
  });

  book.companions = companions;

  // Generate initial image buffer
  onProgress?.({ step: 'generating', message: 'Creating companion art...' });
  book.companions = await generateBufferedImages(book.companions);
}
```

**Step 3: Update progress steps type**

Add new step types to the progress callback type.

**Step 4: Commit**

```bash
git add lib/kindleShareProcessor.ts
git commit -m "feat(kindle): integrate companion research into import flow

- Run research after book enrichment
- Generate initial image buffer
- Add progress callbacks for UI feedback"
```

---

## Task 10: Integrate Unlocks into Timer Screen

**Files:**
- Modify: `app/timer/[bookId].tsx`

**Step 1: Read current timer screen**

Read the file to understand session end flow.

**Step 2: Add companion unlock processing**

After session ends, process companion unlocks:

```typescript
import { processReadingSession } from '../../lib/companionUnlock';
import { checkLootBoxRewards } from '../../lib/lootBox';
import { maybeGenerateImages } from '../../lib/companionImageQueue';

// In handleEndSession:

// Process companion unlocks
if (book.companions) {
  const { unlockedCompanions, earnedLootBoxes, updatedCompanions } =
    processReadingSession(book, elapsed);

  book.companions = updatedCompanions;

  // Add earned loot boxes to progress
  progress.lootBoxes.availableBoxes.push(...earnedLootBoxes);

  // Store unlocked companions for celebration screen
  if (unlockedCompanions.length > 0) {
    // Navigate to unlock celebration or show notification
  }
}

// Check for achievement-based loot boxes
const previousProgress = { ...progress };
// ... update progress with XP, streak, etc ...
const newLootBoxes = checkLootBoxRewards(previousProgress, progress);
progress.lootBoxes.availableBoxes.push(...newLootBoxes);

// Trigger background image generation for next unlocks
maybeGenerateImages(book).then(updatedBook => {
  storage.saveBook(updatedBook);
});
```

**Step 3: Add unlock notification UI**

Show subtle notification when companions unlock during session.

**Step 4: Commit**

```bash
git add app/timer/[bookId].tsx
git commit -m "feat(timer): integrate companion unlocks into reading sessions

- Process reading time milestones on session end
- Award loot boxes for achievements
- Trigger background image generation
- Show unlock notifications"
```

---

## Task 11: Create Collection Screen

**Files:**
- Create: `app/collection.tsx`
- Modify: `app/(tabs)/_layout.tsx` (add tab)

**Step 1: Create collection screen**

```typescript
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { storage } from '../../lib/storage';
import type { Book, Companion, LootBoxState } from '../../lib/types';

type FilterType = 'all' | 'character' | 'creature' | 'object';
type RarityFilter = 'all' | 'common' | 'rare' | 'legendary';

export default function CollectionScreen() {
  const { theme } = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [lootBoxes, setLootBoxes] = useState<LootBoxState | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [loadedBooks, progress] = await Promise.all([
      storage.getBooks(),
      storage.getProgress(),
    ]);
    setBooks(loadedBooks);
    setLootBoxes(progress.lootBoxes);
  }

  // Collect all unlocked companions
  const allCompanions = books.flatMap(book =>
    book.companions?.unlockedCompanions || []
  );

  // Apply filters
  const filtered = allCompanions.filter(c => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (rarityFilter !== 'all' && c.rarity !== rarityFilter) return false;
    return true;
  });

  // Stats
  const totalPossible = books.reduce((sum, book) => {
    if (!book.companions) return sum;
    return sum +
      book.companions.readingTimeQueue.companions.length +
      book.companions.poolQueue.companions.length;
  }, 0);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Stats header */}
      <View style={styles.statsHeader}>
        <Text style={[styles.statsText, { color: theme.text }]}>
          {allCompanions.length} / {totalPossible} companions collected
        </Text>
        {lootBoxes && lootBoxes.availableBoxes.length > 0 && (
          <Pressable style={styles.lootBoxButton}>
            <Text style={styles.lootBoxText}>
              {lootBoxes.availableBoxes.length} boxes to open
            </Text>
          </Pressable>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {/* Type filter buttons */}
        {/* Rarity filter buttons */}
      </View>

      {/* Companion grid */}
      <View style={styles.grid}>
        {filtered.map(companion => (
          <CompanionCard key={companion.id} companion={companion} />
        ))}
      </View>
    </ScrollView>
  );
}

function CompanionCard({ companion }: { companion: Companion }) {
  // Render companion card with image, name, rarity badge, etc.
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  statsText: { fontSize: 16 },
  lootBoxButton: { backgroundColor: '#FFD700', padding: 8, borderRadius: 4 },
  lootBoxText: { fontWeight: 'bold' },
  filters: { flexDirection: 'row', padding: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
});
```

**Step 2: Add to tab navigation**

Update `app/(tabs)/_layout.tsx` to include collection tab.

**Step 3: Commit**

```bash
git add app/collection.tsx app/(tabs)/_layout.tsx
git commit -m "feat(ui): add companion collection screen

- Grid view of all unlocked companions
- Filter by type and rarity
- Collection stats display
- Loot box count with open button"
```

---

## Task 12: Create Loot Box Opening UI

**Files:**
- Create: `app/loot-box.tsx`
- Create: `components/LootBoxReveal.tsx`

**Step 1: Create loot box opening screen**

```typescript
// app/loot-box.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { storage } from '../lib/storage';
import { openLootBox, getPoolCompanions } from '../lib/lootBox';
import { LootBoxReveal } from '../components/LootBoxReveal';
import type { Companion, LootBox } from '../lib/types';

export default function LootBoxScreen() {
  const [revealing, setRevealing] = useState(false);
  const [revealedCompanion, setRevealedCompanion] = useState<Companion | null>(null);
  const [boxCount, setBoxCount] = useState(0);

  async function handleOpenBox() {
    setRevealing(true);

    const [books, progress] = await Promise.all([
      storage.getBooks(),
      storage.getProgress(),
    ]);

    if (progress.lootBoxes.availableBoxes.length === 0) {
      setRevealing(false);
      return;
    }

    // Get current book (most recently read)
    const currentBook = books
      .filter(b => b.status === 'reading')
      .sort((a, b) => b.totalReadingTime - a.totalReadingTime)[0];

    // Get pool and open box
    const pool = getPoolCompanions(books);
    const { companion } = openLootBox(pool, currentBook?.id || null);

    if (companion) {
      // Update book's companion state
      const book = books.find(b => b.id === companion.bookId);
      if (book?.companions) {
        const poolIndex = book.companions.poolQueue.companions.findIndex(
          c => c.id === companion.id
        );
        if (poolIndex !== -1) {
          book.companions.poolQueue.companions[poolIndex] = companion;
          book.companions.unlockedCompanions.push(companion);
          await storage.saveBook(book);
        }
      }

      // Remove used box and record history
      const usedBox = progress.lootBoxes.availableBoxes.shift()!;
      progress.lootBoxes.openHistory.push({
        boxId: usedBox.id,
        openedAt: Date.now(),
        companionId: companion.id,
      });
      await storage.saveProgress(progress);

      setRevealedCompanion(companion);
      setBoxCount(progress.lootBoxes.availableBoxes.length);
    }

    setRevealing(false);
  }

  return (
    <View style={styles.container}>
      {revealedCompanion ? (
        <LootBoxReveal
          companion={revealedCompanion}
          onDismiss={() => setRevealedCompanion(null)}
        />
      ) : (
        <Pressable onPress={handleOpenBox} disabled={revealing}>
          <Text>Open Loot Box</Text>
        </Pressable>
      )}
      {boxCount > 0 && (
        <Text>{boxCount} boxes remaining</Text>
      )}
    </View>
  );
}
```

**Step 2: Create reveal animation component**

```typescript
// components/LootBoxReveal.tsx
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import type { Companion } from '../lib/types';

interface Props {
  companion: Companion;
  onDismiss: () => void;
}

export function LootBoxReveal({ companion, onDismiss }: Props) {
  const rarityColors = {
    common: '#808080',
    rare: '#4169E1',
    legendary: '#FFD700',
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, { borderColor: rarityColors[companion.rarity] }]}>
        {companion.imageUrl && (
          <Image source={{ uri: companion.imageUrl }} style={styles.image} />
        )}
        <Text style={styles.name}>{companion.name}</Text>
        <Text style={[styles.rarity, { color: rarityColors[companion.rarity] }]}>
          {companion.rarity.toUpperCase()}
        </Text>
        <Text style={styles.type}>{companion.type}</Text>
        <Text style={styles.description}>{companion.description}</Text>
        <Text style={styles.source}>
          {companion.source === 'discovered' ? 'Discovered' : 'Inspired'}
        </Text>
      </View>
      <Pressable onPress={onDismiss} style={styles.dismissButton}>
        <Text>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 24, borderWidth: 3, borderRadius: 12, alignItems: 'center' },
  image: { width: 128, height: 128 },
  name: { fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  rarity: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  type: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  description: { fontSize: 14, textAlign: 'center', marginTop: 12 },
  source: { fontSize: 10, opacity: 0.5, marginTop: 8 },
  dismissButton: { marginTop: 24, padding: 12 },
});
```

**Step 3: Commit**

```bash
git add app/loot-box.tsx components/LootBoxReveal.tsx
git commit -m "feat(ui): add loot box opening experience

- LootBoxScreen for opening accumulated boxes
- LootBoxReveal component with reveal animation
- Weighted random selection from pool
- Updates companion state on unlock"
```

---

## Task 13: Update Book Detail Screen

**Files:**
- Modify: `app/book/[id].tsx`

**Step 1: Read current book detail screen**

Understand current companion display.

**Step 2: Replace single companion with collection grid**

Show all companions for this book with locked/unlocked states:

```typescript
// In book detail screen, replace companion section:

{book.companions && (
  <View style={styles.companionsSection}>
    <Text style={styles.sectionTitle}>
      Companions ({book.companions.unlockedCompanions.length} /
      {book.companions.readingTimeQueue.companions.length +
       book.companions.poolQueue.companions.length})
    </Text>

    {/* Next unlock progress */}
    {nextMilestone && (
      <View style={styles.progressBar}>
        <Text>Next unlock in {formatTime(nextMilestone.timeRemaining)}</Text>
      </View>
    )}

    {/* Companion grid */}
    <View style={styles.companionGrid}>
      {/* Unlocked companions */}
      {book.companions.unlockedCompanions.map(c => (
        <CompanionTile key={c.id} companion={c} locked={false} />
      ))}

      {/* Locked companions (silhouettes) */}
      {[...book.companions.readingTimeQueue.companions,
        ...book.companions.poolQueue.companions]
        .filter(c => !c.unlockedAt)
        .map(c => (
          <CompanionTile key={c.id} companion={c} locked={true} />
        ))}
    </View>
  </View>
)}
```

**Step 3: Add progress indicator for next unlock**

```typescript
import { getNextMilestone } from '../../lib/companionUnlock';

const nextMilestone = book.companions
  ? getNextMilestone(book.totalReadingTime)
  : null;
```

**Step 4: Commit**

```bash
git add app/book/[id].tsx
git commit -m "feat(book): show companion collection on book detail

- Grid of unlocked and locked companions
- Progress bar to next unlock milestone
- Locked companions shown as silhouettes
- Collection count display"
```

---

## Task 14: Handle Book Completion Legendary Unlock

**Files:**
- Modify: `app/book/[id].tsx` (status change handler)

**Step 1: Add legendary unlock on book finish**

When book status changes to 'finished', unlock the completion legendary:

```typescript
async function handleStatusChange(newStatus: BookStatus) {
  const updatedBook = { ...book, status: newStatus };

  if (newStatus === 'finished' && book.companions) {
    // Find and unlock completion legendary
    const legendaryIndex = book.companions.poolQueue.companions.findIndex(
      c => c.rarity === 'legendary' && c.unlockMethod === null
    );

    if (legendaryIndex !== -1) {
      const legendary = {
        ...book.companions.poolQueue.companions[legendaryIndex],
        unlockMethod: 'book_completion' as const,
        unlockedAt: Date.now(),
      };

      updatedBook.companions = {
        ...book.companions,
        poolQueue: {
          ...book.companions.poolQueue,
          companions: book.companions.poolQueue.companions.map((c, i) =>
            i === legendaryIndex ? legendary : c
          ),
        },
        unlockedCompanions: [...book.companions.unlockedCompanions, legendary],
      };

      // Show celebration!
      setCompletionLegendary(legendary);
    }

    // Update progress for loot box rewards
    const progress = await storage.getProgress();
    progress.booksFinished++;
    // ... award loot boxes
  }

  await storage.saveBook(updatedBook);
}
```

**Step 2: Add celebration modal for legendary unlock**

Show special celebration when legendary unlocks on book completion.

**Step 3: Commit**

```bash
git add app/book/[id].tsx
git commit -m "feat(book): unlock completion legendary when book finished

- Legendary companion unlocks on status change to finished
- Special celebration modal for legendary reveal
- Awards 2 loot boxes on book completion"
```

---

## Task 15: Add Storage Migration

**Files:**
- Create: `lib/migrations.ts`
- Modify: `lib/storage.ts`

**Step 1: Create migration for existing data**

```typescript
// lib/migrations.ts
import type { Book, UserProgress } from './types';

const CURRENT_VERSION = 2;

export async function migrateData(
  books: Book[],
  progress: UserProgress
): Promise<{ books: Book[]; progress: UserProgress }> {
  let version = progress.version || 1;

  // Migration v1 -> v2: Add companion collection fields
  if (version < 2) {
    // Migrate existing single companions to new format
    books = books.map(book => {
      if (book.companion && !book.companions) {
        // Convert legacy companion to new format
        const legacyCompanion = {
          ...book.companion,
          name: book.companion.creature || 'Companion',
          type: 'creature' as const,
          rarity: 'legendary' as const,
          description: `A ${book.companion.archetype} companion`,
          traits: book.companion.keywords?.join(', ') || '',
          visualDescription: book.companion.keywords?.join(', ') || '',
          source: 'inspired' as const,
          unlockMethod: 'reading_time' as const,
          unlockedAt: book.companion.generatedAt,
        };

        return {
          ...book,
          companions: {
            researchComplete: true,
            researchConfidence: 'low' as const,
            readingTimeQueue: { companions: [], nextGenerateIndex: 0 },
            poolQueue: { companions: [], nextGenerateIndex: 0 },
            unlockedCompanions: [legacyCompanion],
          },
        };
      }
      return book;
    });

    // Add loot box state to progress
    progress = {
      ...progress,
      lootBoxes: progress.lootBoxes || { availableBoxes: [], openHistory: [] },
      booksFinished: progress.booksFinished || 0,
      booksAdded: progress.booksAdded || books.length,
      totalHoursRead: progress.totalHoursRead || 0,
    };

    version = 2;
  }

  return { books, progress: { ...progress, version } };
}
```

**Step 2: Integrate migration into storage load**

```typescript
// In storage.ts, modify getBooks and getProgress to run migration
```

**Step 3: Commit**

```bash
git add lib/migrations.ts lib/storage.ts
git commit -m "feat(storage): add data migration for companion collection

- Migrate v1 single companions to v2 collection format
- Add loot box state to UserProgress
- Track migration version in progress"
```

---

## Summary

This plan covers:

1. **Types** (Task 1) - New data structures
2. **Research** (Tasks 2-5) - LLM research with fallback
3. **Unlocks** (Task 6) - Reading time milestones
4. **Loot Boxes** (Task 7) - Achievement rewards
5. **Image Queue** (Task 8) - Lazy generation
6. **Integration** (Tasks 9-10) - Book add & timer flows
7. **UI** (Tasks 11-14) - Collection, loot box, book detail
8. **Migration** (Task 15) - Existing data compatibility

Each task is TDD with explicit test-first approach.
