import type { Companion, CompanionRarity } from './types';
import { debug } from './debug';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-flash-1.5';

export interface ImagePromptConfig {
  model?: string;
}

/**
 * Get the border instruction for a given rarity level.
 * Only the relevant rarity instruction is provided to avoid confusing the LLM.
 */
export function getBorderInstruction(rarity: CompanionRarity): string {
  switch (rarity) {
    case 'common':
      return 'The sprite should have NO border or frame. Clean edges directly against the white background.';
    case 'rare':
      return 'Add a decorative border in blue (#4A90D9), 2-3 pixels wide. The border must run edge-to-edge around the entire perimeter of the image, forming a complete rectangular frame. You have creative freedom over the pattern - simple lines, dotted edges, small flourishes, or geometric designs all work.';
    case 'legendary':
      return 'Add an ornate border in gold (#F1C40F), 2-3 pixels wide. The border must run edge-to-edge around the entire perimeter of the image, forming a complete rectangular frame. Make it feel prestigious - you have creative freedom over the pattern. Could be elegant filigree, royal motifs, shimmering edges, or other special designs.';
  }
}

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
