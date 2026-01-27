// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'bytedance-seed/seedream-4.5';

export interface ImageGenConfig {
  model?: string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | '3:4' | '9:16';
}

export function buildImagePrompt(creature: string, keywords: string[]): string {
  return `32x32 pixel art sprite, ${creature}, ${keywords.join(', ')}, white background, limited color palette, retro game style, centered, simple, cute`;
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

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: prompt }],
    modalities: ['image', 'text'],
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
