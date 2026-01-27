# Image Generation Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement two-phase image generation with rarity-based borders for consistent companion styling.

**Architecture:** Phase 1 (research) generates physical descriptions only. Phase 2 (new imagePromptBuilder) generates styled image prompts with rarity-specific border rules. Existing companions unchanged.

**Tech Stack:** TypeScript, React Native, OpenRouter API, Jest

---

## Task 1: Add imageSize to Settings

**Files:**
- Modify: `lib/settings.ts:7-36`
- Test: `__tests__/lib/settings.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/settings.test.ts`:

```typescript
it('returns default imageSize of 1K', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  const result = await settings.get();
  expect(result.imageSize).toBe('1K');
});

it('persists imageSize setting', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ imageSize: '2K' }));
  const result = await settings.get();
  expect(result.imageSize).toBe('2K');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/settings.test.ts -t "imageSize"`
Expected: FAIL with "received undefined"

**Step 3: Write minimal implementation**

In `lib/settings.ts`, update the `Settings` interface (after line 11):

```typescript
export interface Settings {
  // API - OpenRouter
  apiKey: string | null;
  llmModel: string;
  imageModel: string;
  imageSize: '1K' | '2K' | '4K';
  // ... rest unchanged
}
```

Update `defaultSettings` (after line 28):

```typescript
export const defaultSettings: Settings = {
  apiKey: null,
  llmModel: 'google/gemini-2.5-flash-preview-05-20',
  imageModel: 'bytedance-seed/seedream-4.5',
  imageSize: '1K',
  // ... rest unchanged
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/settings.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/settings.ts __tests__/lib/settings.test.ts
git commit -m "feat(settings): add imageSize setting with 1K default"
```

---

## Task 2: Add imageSize Dropdown to Config UI

**Files:**
- Modify: `app/config.tsx:173-183`

**Step 1: Add state for dropdown** (no test - UI change)

After line 183 (after the imageModel validation hint), add the image size selector:

```tsx
<Text style={styles.label}>image size_</Text>
<View style={styles.row}>
  {(['1K', '2K', '4K'] as const).map(size => (
    <Pressable
      key={size}
      style={[styles.toggleButton, config.imageSize === size && styles.toggleActive]}
      onPress={() => updateConfig({ imageSize: size })}
    >
      <Text style={[styles.toggleText, config.imageSize === size && styles.toggleTextActive]}>
        [{size}]
      </Text>
    </Pressable>
  ))}
</View>
<Text style={styles.hint}>resolution for generated images (1K recommended)</Text>
```

**Step 2: Verify manually**

Run: `npm start` then open config screen
Expected: Image size toggle appears with 1K/2K/4K options, selection persists

**Step 3: Commit**

```bash
git add app/config.tsx
git commit -m "feat(config): add image size dropdown (1K/2K/4K)"
```

---

## Task 3: Add physicalDescription to Companion Type

**Files:**
- Modify: `lib/types.ts:41-59`
- Test: `__tests__/lib/types.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/types.test.ts`:

```typescript
import type { Companion } from '@/lib/types';

describe('Companion type', () => {
  it('supports both visualDescription and physicalDescription', () => {
    const companion: Companion = {
      id: 'test-1',
      bookId: 'book-1',
      name: 'Test',
      type: 'character',
      rarity: 'common',
      description: 'A test companion',
      traits: 'brave',
      visualDescription: 'old field',
      physicalDescription: 'new field',
      imageUrl: null,
      source: 'discovered',
      unlockMethod: null,
      unlockedAt: null,
    };
    expect(companion.physicalDescription).toBe('new field');
    expect(companion.visualDescription).toBe('old field');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/types.test.ts`
Expected: FAIL with type error for physicalDescription

**Step 3: Write minimal implementation**

In `lib/types.ts`, update the `Companion` interface (line 49):

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
  physicalDescription?: string; // New field - used by new companions
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

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/types.ts __tests__/lib/types.test.ts
git commit -m "feat(types): add optional physicalDescription to Companion"
```

---

## Task 4: Create imagePromptBuilder Module with getBorderInstruction

**Files:**
- Create: `lib/imagePromptBuilder.ts`
- Create: `__tests__/lib/imagePromptBuilder.test.ts`

**Step 1: Write the failing test**

Create `__tests__/lib/imagePromptBuilder.test.ts`:

```typescript
import { getBorderInstruction } from '@/lib/imagePromptBuilder';

describe('imagePromptBuilder', () => {
  describe('getBorderInstruction', () => {
    it('returns no border instruction for common rarity', () => {
      const instruction = getBorderInstruction('common');
      expect(instruction).toContain('NO border');
      expect(instruction).toContain('Clean edges');
    });

    it('returns blue border instruction for rare rarity', () => {
      const instruction = getBorderInstruction('rare');
      expect(instruction).toContain('#4A90D9');
      expect(instruction).toContain('2-3 pixels');
      expect(instruction).toContain('creative freedom');
    });

    it('returns gold border instruction for legendary rarity', () => {
      const instruction = getBorderInstruction('legendary');
      expect(instruction).toContain('#F1C40F');
      expect(instruction).toContain('2-3 pixels');
      expect(instruction).toContain('prestigious');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/imagePromptBuilder.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `lib/imagePromptBuilder.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/imagePromptBuilder.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/imagePromptBuilder.ts __tests__/lib/imagePromptBuilder.test.ts
git commit -m "feat(imagePromptBuilder): add getBorderInstruction for rarity borders"
```

---

## Task 5: Add buildPromptTemplate to imagePromptBuilder

**Files:**
- Modify: `lib/imagePromptBuilder.ts`
- Modify: `__tests__/lib/imagePromptBuilder.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/imagePromptBuilder.test.ts`:

```typescript
import { getBorderInstruction, buildPromptTemplate } from '@/lib/imagePromptBuilder';
import type { Companion } from '@/lib/types';

// ... existing tests ...

describe('buildPromptTemplate', () => {
  const mockCompanion: Companion = {
    id: 'test-1',
    bookId: 'book-1',
    name: 'Fire Dragon',
    type: 'creature',
    rarity: 'legendary',
    description: 'A mighty dragon',
    traits: 'fierce, ancient',
    visualDescription: '',
    physicalDescription: 'Large red dragon with golden scales, fiery eyes, massive wings',
    imageUrl: null,
    source: 'discovered',
    unlockMethod: null,
    unlockedAt: null,
  };

  it('builds prompt with companion details', () => {
    const prompt = buildPromptTemplate(mockCompanion);
    expect(prompt).toContain('Fire Dragon');
    expect(prompt).toContain('creature');
    expect(prompt).toContain('Large red dragon with golden scales');
  });

  it('includes style requirements', () => {
    const prompt = buildPromptTemplate(mockCompanion);
    expect(prompt).toContain('32x32 pixel art');
    expect(prompt).toContain('White background');
    expect(prompt).toContain('retro color palette');
  });

  it('includes correct border instruction for rarity', () => {
    const prompt = buildPromptTemplate(mockCompanion);
    expect(prompt).toContain('#F1C40F'); // legendary gold
    expect(prompt).not.toContain('#4A90D9'); // should not include rare blue
  });

  it('instructs LLM to output only the prompt', () => {
    const prompt = buildPromptTemplate(mockCompanion);
    expect(prompt).toContain('Output ONLY the image prompt');
  });

  it('falls back to visualDescription if physicalDescription missing', () => {
    const oldCompanion: Companion = {
      ...mockCompanion,
      physicalDescription: undefined,
      visualDescription: 'Old visual description here',
    };
    const prompt = buildPromptTemplate(oldCompanion);
    expect(prompt).toContain('Old visual description here');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/imagePromptBuilder.test.ts -t "buildPromptTemplate"`
Expected: FAIL with "buildPromptTemplate is not a function"

**Step 3: Write minimal implementation**

Add to `lib/imagePromptBuilder.ts`:

```typescript
import type { Companion, CompanionRarity } from './types';

// ... existing getBorderInstruction ...

/**
 * Build the prompt template for the LLM to generate an image prompt.
 * Uses physicalDescription if available, falls back to visualDescription for legacy companions.
 */
export function buildPromptTemplate(companion: Companion): string {
  const description = companion.physicalDescription || companion.visualDescription;
  const borderInstruction = getBorderInstruction(companion.rarity);

  return `You are a pixel art prompt engineer. Create an image generation prompt for this character:

Name: ${companion.name}
Type: ${companion.type}
Description: ${description}

Requirements:
- 32x32 pixel art sprite
- White background
- Limited retro color palette
- Centered composition
- Simple, cute aesthetic

${borderInstruction}

Output ONLY the image prompt, no explanation or markdown.`;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/imagePromptBuilder.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/imagePromptBuilder.ts __tests__/lib/imagePromptBuilder.test.ts
git commit -m "feat(imagePromptBuilder): add buildPromptTemplate with rarity borders"
```

---

## Task 6: Add generateImagePrompt Function

**Files:**
- Modify: `lib/imagePromptBuilder.ts`
- Modify: `__tests__/lib/imagePromptBuilder.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/imagePromptBuilder.test.ts`:

```typescript
import { getBorderInstruction, buildPromptTemplate, generateImagePrompt } from '@/lib/imagePromptBuilder';

// Mock fetch globally
global.fetch = jest.fn();

// ... existing tests ...

describe('generateImagePrompt', () => {
  const mockCompanion: Companion = {
    id: 'test-1',
    bookId: 'book-1',
    name: 'Fire Dragon',
    type: 'creature',
    rarity: 'legendary',
    description: 'A mighty dragon',
    traits: 'fierce, ancient',
    visualDescription: '',
    physicalDescription: 'Large red dragon with golden scales',
    imageUrl: null,
    source: 'discovered',
    unlockMethod: null,
    unlockedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls OpenRouter API with correct parameters', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '32x32 pixel art dragon with gold border' } }],
      }),
    });

    await generateImagePrompt(mockCompanion, 'test-api-key', { model: 'test-model' });

    expect(fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-api-key',
        }),
      })
    );

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.model).toBe('test-model');
    expect(body.messages[0].content).toContain('Fire Dragon');
  });

  it('returns the generated prompt from LLM response', async () => {
    const expectedPrompt = '32x32 pixel art dragon with gold ornate border';
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: expectedPrompt } }],
      }),
    });

    const result = await generateImagePrompt(mockCompanion, 'test-api-key', {});
    expect(result).toBe(expectedPrompt);
  });

  it('throws error on API failure', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('API error'),
    });

    await expect(generateImagePrompt(mockCompanion, 'test-api-key', {}))
      .rejects.toThrow('Image prompt generation failed');
  });

  it('throws error when no content in response', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [] }),
    });

    await expect(generateImagePrompt(mockCompanion, 'test-api-key', {}))
      .rejects.toThrow('No content in image prompt response');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/imagePromptBuilder.test.ts -t "generateImagePrompt"`
Expected: FAIL with "generateImagePrompt is not a function"

**Step 3: Write minimal implementation**

Add to `lib/imagePromptBuilder.ts`:

```typescript
import type { Companion, CompanionRarity } from './types';
import { debug } from './debug';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.5-flash-preview-05-20';

export interface ImagePromptConfig {
  model?: string;
}

// ... existing functions ...

/**
 * Generate an image prompt for a companion using the LLM.
 * This is Phase 2 of the two-phase image generation system.
 *
 * @throws Error if LLM call fails - no fallback, fail cleanly
 */
export async function generateImagePrompt(
  companion: Companion,
  apiKey: string,
  config: ImagePromptConfig = {}
): Promise<string> {
  const model = config.model || DEFAULT_MODEL;
  const promptTemplate = buildPromptTemplate(companion);

  debug.log('imagePrompt', `Generating image prompt for "${companion.name}"`, {
    model,
    rarity: companion.rarity,
  });

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://blahread.app',
      'X-Title': 'Blah Read',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: promptTemplate }],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    debug.error('imagePrompt', `API failed for "${companion.name}"`, error);
    throw new Error(`Image prompt generation failed: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    debug.error('imagePrompt', `No content in response for "${companion.name}"`, data);
    throw new Error('No content in image prompt response');
  }

  debug.log('imagePrompt', `Generated prompt for "${companion.name}"`, {
    promptLength: content.length,
  });

  return content.trim();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/imagePromptBuilder.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/imagePromptBuilder.ts __tests__/lib/imagePromptBuilder.test.ts
git commit -m "feat(imagePromptBuilder): add generateImagePrompt with LLM call"
```

---

## Task 7: Update Research Schema for physicalDescription

**Files:**
- Modify: `lib/companionResearch.ts:11-84`
- Modify: `__tests__/lib/companionResearch.test.ts`

**Step 1: Write the failing test**

Update `__tests__/lib/companionResearch.test.ts`:

```typescript
describe('buildResearchPrompt', () => {
  // ... existing tests ...

  it('asks for physicalDescription not visualDescription', () => {
    const prompt = buildResearchPrompt('Test Book', 'Author');
    expect(prompt).toContain('physicalDescription');
    expect(prompt).not.toContain('visualDescription');
    expect(prompt).toContain('Do NOT include');
    expect(prompt).toContain('borders');
  });
});

describe('parseResearchResponse', () => {
  it('maps physicalDescription to companion', () => {
    const response = {
      companions: [{
        name: 'Hero',
        type: 'character' as const,
        rarity: 'legendary' as const,
        description: 'The protagonist',
        role: 'Main character',
        traits: 'Brave',
        physicalDescription: 'Tall warrior with silver armor',
      }],
      researchConfidence: 'high' as const,
    };

    const result = parseResearchResponse(response, 'book-123');
    expect(result.companions[0].physicalDescription).toBe('Tall warrior with silver armor');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/companionResearch.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Update `lib/companionResearch.ts`:

**Schema (lines 11-33):**
```typescript
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
```

**Interface (lines 35-46):**
```typescript
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
```

**Prompt (lines 56-84):**
```typescript
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
```

**Parser (lines 89-112):**
```typescript
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
    visualDescription: '', // Keep for backwards compatibility
    physicalDescription: item.physicalDescription,
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/companionResearch.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/companionResearch.ts __tests__/lib/companionResearch.test.ts
git commit -m "feat(research): use physicalDescription instead of visualDescription"
```

---

## Task 8: Update Inspired Templates

**Files:**
- Modify: `lib/inspiredCompanions.ts:7-162`
- Modify: `__tests__/lib/inspiredCompanions.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/inspiredCompanions.test.ts`:

```typescript
import { generateInspiredCompanions, INSPIRED_TEMPLATES } from '@/lib/inspiredCompanions';

describe('INSPIRED_TEMPLATES', () => {
  it('all templates have physicalDescription', () => {
    for (const template of INSPIRED_TEMPLATES) {
      expect(template).toHaveProperty('physicalDescription');
      expect(template.physicalDescription).toBeTruthy();
    }
  });
});

describe('generateInspiredCompanions', () => {
  it('generates companions with physicalDescription', () => {
    const companions = generateInspiredCompanions('book-1', 'A story about magic', 3);
    for (const companion of companions) {
      expect(companion.physicalDescription).toBeTruthy();
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/inspiredCompanions.test.ts -t "physicalDescription"`
Expected: FAIL

**Step 3: Write minimal implementation**

Update `lib/inspiredCompanions.ts`:

**Interface (lines 7-14):**
```typescript
interface InspiredTemplate {
  name: string;
  type: CompanionType;
  description: string;
  traits: string;
  physicalDescription: string;
  keywords: string[];
}
```

**Templates (lines 20-162):** Change all `visualDescription` to `physicalDescription`. Example for first template:

```typescript
{
  name: 'The Wanderer',
  type: 'character',
  description: 'A mysterious traveler who has seen countless lands and carries wisdom from distant places.',
  traits: 'Mysterious, wise, well-traveled, introspective',
  physicalDescription: 'Cloaked figure with a walking staff, weathered face, distant gaze, travel-worn clothes',
  keywords: ['journey', 'travel', 'wander', 'road', 'path', 'quest', 'adventure', 'explore', 'stranger'],
},
```

(Repeat for all 17 templates - same values, just rename the field)

**Generator (lines 255-268):**
```typescript
const companions: Companion[] = selectedTemplates.map((template, index) => ({
  id: `${bookId}-inspired-${index}-${Date.now()}`,
  bookId,
  name: template.name,
  type: template.type,
  rarity: rarities[index],
  description: template.description,
  traits: template.traits,
  visualDescription: '', // Keep for backwards compatibility
  physicalDescription: template.physicalDescription,
  imageUrl: null,
  source: 'inspired' as const,
  unlockMethod: null,
  unlockedAt: null,
}));
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/inspiredCompanions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/inspiredCompanions.ts __tests__/lib/inspiredCompanions.test.ts
git commit -m "feat(inspired): use physicalDescription in templates"
```

---

## Task 9: Update imageGen to Use New Prompt Builder

**Files:**
- Modify: `lib/imageGen.ts:9-12, 110-193`
- Modify: `__tests__/lib/imageGen.test.ts`

**Step 1: Write the failing test**

Add to `__tests__/lib/imageGen.test.ts`:

```typescript
import { ImageGenConfig } from '@/lib/imageGen';

describe('ImageGenConfig', () => {
  it('accepts imageSize parameter', () => {
    const config: ImageGenConfig = {
      model: 'test-model',
      imageSize: '2K',
    };
    expect(config.imageSize).toBe('2K');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/imageGen.test.ts -t "imageSize"`
Expected: FAIL with type error

**Step 3: Write minimal implementation**

Update `lib/imageGen.ts`:

**Config interface (lines 9-12):**
```typescript
export interface ImageGenConfig {
  model?: string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | '3:4' | '9:16';
  imageSize?: '1K' | '2K' | '4K';
  llmModel?: string; // For image prompt generation
}
```

**Import and update generateImageForCompanion (lines 1-5):**
```typescript
import type { Companion } from './types';
import { debug } from './debug';
import { saveCompanionImage } from './imageStorage';
import { generateImagePrompt } from './imagePromptBuilder';
```

**Update generateImageForCompanion function (lines 110-193):**
```typescript
export async function generateImageForCompanion(
  companion: Companion,
  apiKey: string,
  config: ImageGenConfig = {}
): Promise<string> {
  const model = config.model || DEFAULT_MODEL;

  // Phase 2: Generate styled prompt via LLM
  let prompt: string;
  try {
    prompt = await generateImagePrompt(companion, apiKey, { model: config.llmModel });
  } catch (error) {
    debug.error('imageGen', `Failed to generate prompt for "${companion.name}"`, error);
    throw error; // No fallback - fail cleanly
  }

  const modalities = getModalitiesForModel(model);

  debug.log('imageGen', `Starting image generation for "${companion.name}"`, {
    model,
    modalities,
    type: companion.type,
    rarity: companion.rarity,
  });
  debug.log('imageGen', 'Prompt:', prompt);

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: prompt }],
    modalities,
  };

  // Add Gemini-specific image config
  if (model.includes('gemini')) {
    body.image_config = {
      aspect_ratio: config.aspectRatio || '1:1',
    };
    if (config.imageSize) {
      (body.image_config as Record<string, unknown>).output_size = config.imageSize;
    }
  }

  debug.log('imageGen', 'Sending request to OpenRouter...', { url: OPENROUTER_API_URL, modalities });
  debug.time('imageGen', `image-${companion.id}`);

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://blahread.app',
      'X-Title': 'Blah Read',
    },
    body: JSON.stringify(body),
  });

  debug.timeEnd('imageGen', `image-${companion.id}`);

  if (!response.ok) {
    const error = await response.text();
    debug.error('imageGen', `Request failed with status ${response.status}`, error);
    throw new Error(`Image generation failed: ${error}`);
  }

  debug.log('imageGen', 'Response received', { status: response.status });

  const data: OpenRouterImageResponse = await response.json();
  debug.log('imageGen', 'Response parsed', {
    hasChoices: !!data.choices?.length,
    hasImages: !!data.choices?.[0]?.message?.images?.length,
  });

  const images = data.choices?.[0]?.message?.images;
  if (!images || images.length === 0) {
    debug.error('imageGen', 'No image in response', data);
    throw new Error('No image returned from API');
  }

  const imageUrl = images[0].image_url.url;
  debug.log('imageGen', `Image generated successfully for "${companion.name}"`, {
    urlPreview: imageUrl.substring(0, 80) + '...',
    isBase64: imageUrl.startsWith('data:'),
  });

  if (imageUrl.startsWith('data:')) {
    debug.log('imageGen', `Saving base64 image to file system for "${companion.name}"`);
    const localUri = await saveCompanionImage(imageUrl, companion.id);
    debug.log('imageGen', `Image saved locally: ${localUri}`);
    return localUri;
  }

  return imageUrl;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/imageGen.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/imageGen.ts __tests__/lib/imageGen.test.ts
git commit -m "feat(imageGen): integrate imagePromptBuilder and add imageSize support"
```

---

## Task 10: Update Callers to Pass New Config

**Files:**
- Modify: `lib/kindleShareProcessor.ts:133-140`
- Modify: `lib/companionOrchestrator.ts` (if applicable)

**Step 1: Update kindleShareProcessor**

In `lib/kindleShareProcessor.ts`, update the image generation call (around line 138):

```typescript
const url = await generateImageForCompanion(companion, config.apiKey!, {
  model: config.imageModel,
  imageSize: config.imageSize,
  llmModel: config.llmModel,
});
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add lib/kindleShareProcessor.ts
git commit -m "feat(kindle): pass imageSize and llmModel to image generation"
```

---

## Task 11: Final Integration Test

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Manual verification**

1. Start app: `npm start`
2. Go to config, set imageSize to 2K
3. Add a new book
4. Wait for companion research
5. Unlock a companion
6. Verify image generates with appropriate border (or no border for common)

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete image generation redesign with rarity borders

- Two-phase approach: research → image prompt → image
- Rarity-based borders: none (common), blue (rare), gold (legendary)
- New imageSize config (1K/2K/4K)
- physicalDescription replaces visualDescription for new companions
- Legacy companions unchanged"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add imageSize to Settings | `lib/settings.ts` |
| 2 | Add imageSize dropdown to Config UI | `app/config.tsx` |
| 3 | Add physicalDescription to Companion type | `lib/types.ts` |
| 4 | Create imagePromptBuilder with getBorderInstruction | `lib/imagePromptBuilder.ts` |
| 5 | Add buildPromptTemplate | `lib/imagePromptBuilder.ts` |
| 6 | Add generateImagePrompt | `lib/imagePromptBuilder.ts` |
| 7 | Update research schema for physicalDescription | `lib/companionResearch.ts` |
| 8 | Update inspired templates | `lib/inspiredCompanions.ts` |
| 9 | Update imageGen to use new prompt builder | `lib/imageGen.ts` |
| 10 | Update callers with new config | `lib/kindleShareProcessor.ts` |
| 11 | Final integration test | - |
