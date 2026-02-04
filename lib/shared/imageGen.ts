import type { Companion } from './types';
import { debug } from './debug';
import { saveCompanionImage } from './imageStorage';
import { generateImagePrompt } from './imagePromptBuilder';

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.5-flash-image';

// Image size presets (must be multiples of 16 for FLUX)
const IMAGE_SIZE_MAP = {
  '1K': { width: 1024, height: 1024 },
  '2K': { width: 2048, height: 2048 },
  '4K': { width: 4096, height: 4096 },
} as const;

export interface ImageGenConfig {
  model?: string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | '3:4' | '9:16';
  imageSize?: '1K' | '2K' | '4K';
  llmModel?: string; // For image prompt generation
}

/**
 * Determine the correct modalities for a model
 * Pure image generation models only support image output
 * Multimodal models (gemini) support both image and text
 */
function getModalitiesForModel(model: string): string[] {
  const isPureImageModel = model.includes('seedream') ||
                           model.includes('flux') ||
                           model.includes('stable-diffusion') ||
                           model.includes('dall-e') ||
                           model.includes('ideogram') ||
                           model.includes('recraft') ||
                           model.includes('midjourney');

  return isPureImageModel ? ['image'] : ['image', 'text'];
}

export function buildImagePrompt(creature: string, keywords: string[]): string {
  return `32x32 pixel art sprite, ${creature}, ${keywords.join(', ')}, white background, limited color palette, retro game style, centered, simple, cute`;
}

/**
 * Build an image prompt from a Companion's visual description
 */
export function buildCompanionImagePrompt(companion: Companion): string {
  return `32x32 pixel art sprite, ${companion.name}, ${companion.visualDescription}, white background, limited color palette, retro game style, centered, simple, cute`;
}

export interface OpenRouterImageResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
      images?: Array<{
        type: string;
        image_url: {
          url: string;
        };
      }>;
    };
  }>;
}

export async function generateCompanionImage(
  creature: string,
  keywords: string[],
  apiKey: string,
  config: ImageGenConfig = {}
): Promise<string> {
  const model = config.model || DEFAULT_MODEL;
  const prompt = buildImagePrompt(creature, keywords);
  const modalities = getModalitiesForModel(model);

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: prompt }],
    modalities,
  };

  // Add Gemini-specific image config if using a Gemini model
  if (model.includes('gemini') && config.aspectRatio) {
    body.image_config = {
      aspect_ratio: config.aspectRatio,
    };
  }

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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Image generation failed: ${error}`);
  }

  const data: OpenRouterImageResponse = await response.json();

  // Extract image from response
  const images = data.choices?.[0]?.message?.images;
  if (!images || images.length === 0) {
    throw new Error('No image returned from API');
  }

  return images[0].image_url.url;
}

/**
 * Generate an image for a companion using its visual description
 */
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

  // For FLUX models, add aspect ratio to prompt as backup
  let finalPrompt = prompt;
  if (model.includes('flux')) {
    // Prepend square format instruction as fallback if params aren't forwarded
    finalPrompt = `Square format, 1:1 aspect ratio. ${prompt}`;
    debug.log('imageGen', 'Added square format instruction for FLUX model');
  }

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: finalPrompt }],
    modalities,
  };

  // Add model-specific image config
  if (model.includes('gemini')) {
    // Gemini uses image_config with aspect_ratio and output_size
    body.image_config = {
      aspect_ratio: config.aspectRatio || '1:1',
    };
    if (config.imageSize) {
      (body.image_config as Record<string, unknown>).output_size = config.imageSize;
    }
  }
  // FLUX: OpenRouter rejects width/height params - rely on prompt text only

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

  // Extract image from response
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

  // If it's a base64 data URL, save to file system to avoid AsyncStorage limits
  if (imageUrl.startsWith('data:')) {
    debug.log('imageGen', `Saving base64 image to file system for "${companion.name}"`);
    const localUri = await saveCompanionImage(imageUrl, companion.id);
    debug.log('imageGen', `Image saved locally: ${localUri}`);
    return localUri;
  }

  return imageUrl;
}
