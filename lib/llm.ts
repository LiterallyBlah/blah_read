export interface CompanionData {
  archetype: string;
  creature: string;
  keywords: string[];
}

export function buildCompanionPrompt(synopsis: string): string {
  return `Analyze this book synopsis and extract:
1. The main character archetype (e.g., Knight, Cultivator, Wizard, Hacker, Survivor)
2. A companion creature that fits the story (e.g., Dragon, AI Bot, Wolf, Phoenix)
3. Three visual keywords to describe the companion

Synopsis: "${synopsis}"

Respond in exactly this format:
Archetype: [archetype]
Creature: [creature]
Keywords: [keyword1], [keyword2], [keyword3]`;
}

export function parseCompanionResponse(response: string): CompanionData {
  const archetypeMatch = response.match(/Archetype:\s*(.+)/i);
  const creatureMatch = response.match(/Creature:\s*(.+)/i);
  const keywordsMatch = response.match(/Keywords:\s*(.+)/i);

  return {
    archetype: archetypeMatch?.[1]?.trim() || 'Adventurer',
    creature: creatureMatch?.[1]?.trim() || 'Spirit',
    keywords: keywordsMatch?.[1]?.split(',').map(k => k.trim()) || ['mystical', 'glowing', 'small'],
  };
}

export async function generateCompanionData(synopsis: string, apiKey: string): Promise<CompanionData> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: buildCompanionPrompt(synopsis) }],
      max_tokens: 150,
    }),
  });

  const data = await response.json();
  return parseCompanionResponse(data.choices[0].message.content);
}
