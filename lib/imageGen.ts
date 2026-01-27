export function buildImagePrompt(creature: string, keywords: string[]): string {
  return `32x32 pixel art sprite, ${creature}, ${keywords.join(', ')}, white background, limited color palette, retro game style, centered, simple, cute`;
}

export async function generateCompanionImage(
  creature: string,
  keywords: string[],
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: buildImagePrompt(creature, keywords),
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
  });

  const data = await response.json();
  return data.data[0].url;
}
